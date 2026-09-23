#!/usr/bin/env node
/**
 * sync-versions.mjs — keep the version pills on every page in step with the
 * live tools, so the site stops going stale every time a tool ships.
 *
 * What it does:
 *   1. For each tool in data/versions.json, ask the GitHub API for the latest
 *      published Release of its repo (falling back to the newest tag).
 *   2. Write the resolved version back into data/versions.json.
 *   3. Rewrite the matching <span data-sync="version:TOOL"> pills on every page
 *      listed in scripts/pages.mjs.
 *
 * It never invents a version: if a repo has no release/tag or the API can't be
 * reached, that tool keeps whatever version is already recorded. Running it with
 * no network still regenerates the pages from data/versions.json, so this file
 * is the single generator for those pills.
 *
 * Usage:  node scripts/sync-versions.mjs [--check]
 *   --check  exit 1 if any page would change (no writes) — handy in CI.
 *
 * Auth: set GITHUB_TOKEN to raise the API rate limit. The sibling repos are
 * public, so the default Actions token can read their releases.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PAGES } from "./pages.mjs";
import { ROOT, readPage, writeIfChanged, isMain } from "./lib.mjs";

const DATA = resolve(ROOT, "data/versions.json");

const API = "https://api.github.com";
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "slopstopper-version-sync",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

/** Normalise a tag to the site's short style, e.g. "v0.7.0" -> "v0.7". */
function display(tag) {
  if (!tag) return null;
  let t = String(tag).trim().replace(/^release[-/ ]?/i, "");
  if (!/^v/i.test(t)) t = "v" + t;
  const m = t.match(/^v(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!m) return t; // non-semver tag: keep as-is
  const [, major, minor, patch] = m;
  return patch && patch !== "0" ? `v${major}.${minor}.${patch}` : `v${major}.${minor}`;
}

export { display };

export async function latestVersion(repo, fetchImpl = fetch) {
  try {
    const r = await fetchImpl(`${API}/repos/${repo}/releases/latest`, { headers });
    if (r.ok) {
      const j = await r.json();
      if (j.tag_name) return display(j.tag_name);
    } else if (r.status !== 404) {
      console.warn(`  ${repo}: releases/latest -> HTTP ${r.status}`);
    }
  } catch (e) {
    console.warn(`  ${repo}: releases/latest failed (${e.message})`);
  }
  try {
    const r = await fetchImpl(`${API}/repos/${repo}/tags?per_page=1`, { headers });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j) && j[0]?.name) return display(j[0].name);
    } else {
      console.warn(`  ${repo}: tags -> HTTP ${r.status}`);
    }
  } catch (e) {
    console.warn(`  ${repo}: tags failed (${e.message})`);
  }
  return null;
}

/** Replace the text of <span ... data-sync="version:TOOL" ...>OLD</span>. Silent no-op if absent. */
export function patchPill(html, tool, version) {
  const re = new RegExp(
    `(<span\\b[^>]*\\bdata-sync="version:${tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>)([^<]*)(</span>)`,
    "g"
  );
  let changed = false;
  const out = html.replace(re, (_, open, old, close) => {
    if (old.trim() === version) return open + old + close;
    changed = true;
    return open + version + close;
  });
  return { html: out, changed };
}

export async function run({ check = false, fetchImpl = fetch } = {}) {
  const data = JSON.parse(await readFile(DATA, "utf8"));
  let dataChanged = false;
  for (const [tool, meta] of Object.entries(data.tools)) {
    const fetched = meta.repo ? await latestVersion(meta.repo, fetchImpl) : null;
    if (fetched && fetched !== meta.version) {
      console.log(`  data: ${tool} ${meta.version} -> ${fetched}`);
      meta.version = fetched;
      dataChanged = true;
    } else if (!fetched) {
      console.log(`  ${tool}: no upstream version found, keeping ${meta.version}`);
    }
  }
  const pages = [];
  for (const p of PAGES) {
    const prev = await readPage(p.file);
    let html = prev;
    for (const [tool, meta] of Object.entries(data.tools)) {
      html = patchPill(html, tool, meta.version).html;
    }
    if (await writeIfChanged(p.file, html, prev, check)) pages.push(p.file);
  }
  if (dataChanged && !check) {
    data.lastSynced = process.env.SYNC_TIMESTAMP || data.lastSynced || null;
    await writeFile(DATA, JSON.stringify(data, null, 2) + "\n");
  }
  return { pages, data: dataChanged };
}

if (isMain(import.meta.url)) {
  const check = process.argv.includes("--check");
  run({ check }).then(({ pages, data }) => {
    if (check) {
      if (pages.length) { console.error(`versions: pages out of sync: ${pages.join(", ")}`); process.exit(1); }
      console.log("versions: pages in sync."); return;
    }
    const touched = [...pages, data ? "data/versions.json" : ""].filter(Boolean);
    console.log(touched.length ? `versions: updated ${touched.join(", ")}` : "versions: everything already in sync.");
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
