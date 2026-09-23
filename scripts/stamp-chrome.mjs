#!/usr/bin/env node
/**
 * stamp-chrome.mjs — write templates/header.html and templates/footer.html
 * into every page listed in scripts/pages.mjs, between
 *   <!-- chrome:header --> … <!-- /chrome:header -->
 *   <!-- chrome:footer --> … <!-- /chrome:footer -->
 * rewriting {{root}} to the relative prefix for that page's depth. Also fills
 *   <!-- inline:PATH --> … <!-- /inline:PATH -->
 * with the file at PATH (repo-relative), so an asset such as assets/plumb.svg
 * stays an editable file yet lands inline where CSS and JS can reach it.
 *
 * Usage: node scripts/stamp-chrome.mjs [--check]
 *   --check  exit 1 if any page would change; writes nothing.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PAGES, rootFor } from "./pages.mjs";
import { ROOT, readPage, replaceRegion, writeIfChanged, isMain } from "./lib.mjs";

export function renderTemplate(tpl, root) {
  return tpl.replaceAll("{{root}}", root);
}

export function stampPage(html, templates, root, file) {
  let out = replaceRegion(html, "chrome:header", renderTemplate(templates.header, root), file);
  out = replaceRegion(out, "chrome:footer", renderTemplate(templates.footer, root), file);
  return out;
}

const INLINE_OPEN = /<!-- inline:([^\s]+) -->/g;

/** Fill every <!-- inline:PATH --> region with the asset readAsset(PATH) returns. */
export async function inlineAssets(html, file, readAsset) {
  const paths = [...new Set([...html.matchAll(INLINE_OPEN)].map((m) => m[1]))];
  let out = html;
  for (const p of paths) {
    const asset = await readAsset(p);
    if (asset === null) throw new Error(`${file}: inline asset ${p} does not exist`);
    const name = `inline:${p}`;
    const open = `<!-- ${name} -->`, close = `<!-- /${name} -->`;
    const content = `\n${asset.trim()}\n`;
    let cursor = 0, a;
    while ((a = out.indexOf(open, cursor)) !== -1) {
      out = out.slice(0, a) + replaceRegion(out.slice(a), name, content, file);
      cursor = a + open.length + content.length + close.length;
    }
  }
  return out;
}

async function readAssetFromRoot(p) {
  try { return await readFile(resolve(ROOT, p), "utf8"); }
  catch (e) { if (e.code === "ENOENT") return null; throw e; }
}

export async function loadTemplates() {
  const [header, footer] = await Promise.all([
    readFile(resolve(ROOT, "templates/header.html"), "utf8"),
    readFile(resolve(ROOT, "templates/footer.html"), "utf8"),
  ]);
  return { header: `\n${header.trim()}\n`, footer: `\n${footer.trim()}\n` };
}

export async function run({ check = false } = {}) {
  const templates = await loadTemplates();
  const changed = [];
  for (const p of PAGES) {
    const prev = await readPage(p.file);
    const stamped = stampPage(prev, templates, rootFor(p.depth), p.file);
    const next = await inlineAssets(stamped, p.file, readAssetFromRoot);
    if (await writeIfChanged(p.file, next, prev, check)) changed.push(p.file);
  }
  return changed;
}

if (isMain(import.meta.url)) {
  const check = process.argv.includes("--check");
  run({ check }).then((changed) => {
    if (changed.length === 0) { console.log("chrome: all pages in sync."); return; }
    if (check) { console.error(`chrome: out of sync: ${changed.join(", ")}`); process.exit(1); }
    console.log(`chrome: stamped ${changed.join(", ")}`);
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
