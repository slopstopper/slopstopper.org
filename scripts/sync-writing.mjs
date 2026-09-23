#!/usr/bin/env node
/**
 * sync-writing.mjs — list the release write-ups in slopstopper/plumb-line
 * docs/content and render them into every page carrying
 *   <!-- writing:list --> … <!-- /writing:list -->
 *
 * Pieces are files named YYYY-MM-DD-<slug>.md; anything else (TEMPLATE.md,
 * WATCHER.md) is skipped. The title is the first "# " heading; a file with no
 * heading is skipped with a warning naming it. The list is written to
 * data/writing.json (newest first) and rendered from there, so a run with no
 * network still regenerates the pages from the committed JSON.
 *
 * Never invents a row. Usage: node scripts/sync-writing.mjs [--check]
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PAGES } from "./pages.mjs";
import { ROOT, readPage, hasRegion, replaceRegion, escapeHtml, writeIfChanged, isMain } from "./lib.mjs";

const SOURCE_REPO = "slopstopper/plumb-line";
const SOURCE_PATH = "docs/content";
const DATA = resolve(ROOT, "data/writing.json");
const API = "https://api.github.com";
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "slopstopper-writing-sync",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const PIECE = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;

export function isPiece(name) {
  return PIECE.test(name);
}

export function titleOf(markdown) {
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("# ")) return line.slice(2).trim();
  }
  return null;
}

export function sortPieces(items) {
  return [...items].sort((a, b) =>
    a.date === b.date ? (a.slug < b.slug ? 1 : a.slug > b.slug ? -1 : 0) : a.date < b.date ? 1 : -1
  );
}

export function renderRows(items) {
  if (items.length === 0) return "\n";
  return "\n" + items.map((p) =>
    `      <li><span class="d">${escapeHtml(p.date)}</span>\n` +
    `        <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a></li>`
  ).join("\n") + "\n";
}

/** Returns the sorted piece list, or null if the listing could not be fetched. */
export async function collect(fetchImpl = fetch) {
  let listing;
  try {
    const r = await fetchImpl(`${API}/repos/${SOURCE_REPO}/contents/${SOURCE_PATH}`, { headers });
    if (!r.ok) { console.warn(`  writing: listing -> HTTP ${r.status}`); return null; }
    listing = await r.json();
  } catch (e) {
    console.warn(`  writing: listing failed (${e.message})`);
    return null;
  }
  const out = [];
  for (const entry of listing) {
    const m = PIECE.exec(entry.name);
    if (!m) continue;
    let md;
    try {
      const r = await fetchImpl(entry.download_url, { headers });
      if (!r.ok) { console.warn(`  writing: ${entry.name} -> HTTP ${r.status}, skipped`); continue; }
      md = await r.text();
    } catch (e) {
      console.warn(`  writing: ${entry.name} failed (${e.message}), skipped`);
      continue;
    }
    const title = titleOf(md);
    if (!title) { console.warn(`  writing: ${entry.name} has no "# " heading, skipped`); continue; }
    out.push({ date: m[1], slug: m[2], title, url: entry.html_url });
  }
  return sortPieces(out);
}

export async function run({ check = false, fetchImpl = fetch } = {}) {
  let data;
  try { data = JSON.parse(await readFile(DATA, "utf8")); }
  catch { data = { source: `${SOURCE_REPO}:${SOURCE_PATH}`, pieces: [], lastSynced: null }; }

  const fetched = await collect(fetchImpl);
  let dataChanged = false;
  if (fetched) {
    if (JSON.stringify(fetched) !== JSON.stringify(data.pieces)) { data.pieces = fetched; dataChanged = true; }
  } else {
    console.warn(`  writing: keeping ${data.pieces.length} committed piece(s)`);
  }

  const rows = renderRows(data.pieces);
  const pages = [];
  for (const p of PAGES) {
    const prev = await readPage(p.file);
    if (!hasRegion(prev, "writing:list")) continue;
    const next = replaceRegion(prev, "writing:list", rows, p.file);
    if (await writeIfChanged(p.file, next, prev, check)) pages.push(p.file);
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
      if (pages.length) { console.error(`writing: pages out of sync: ${pages.join(", ")}`); process.exit(1); }
      console.log("writing: pages in sync."); return;
    }
    const touched = [...pages, data ? "data/writing.json" : ""].filter(Boolean);
    console.log(touched.length ? `writing: updated ${touched.join(", ")}` : "writing: everything already in sync.");
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
