#!/usr/bin/env node
/**
 * check-links.mjs — every relative href/src in the pages must resolve to a
 * file (or a directory with index.html), every #anchor must exist, and no
 * page may load a script, stylesheet, iframe or image from another origin.
 * External http(s) links are not fetched. Exits 1 with a list of problems.
 */
import { readFile } from "node:fs/promises";
import { resolve, posix } from "node:path";
import { PAGES } from "./pages.mjs";
import { ROOT, readPage, isMain } from "./lib.mjs";

const REF = /\b(href|src)=["']([^"']+)["']/g;
const SKIP = /^(https?:|mailto:|data:|tel:)/i;

export function extractRefs(html) {
  const out = [];
  for (const m of html.matchAll(REF)) out.push({ attr: m[1], value: m[2] });
  return out;
}

export function externalCalls(html) {
  const out = [];
  for (const m of html.matchAll(/<(script|link|iframe|img)\b[^>]*>/gi)) {
    const tag = m[0];
    if (/^<iframe/i.test(tag)) { out.push(tag); continue; }
    if (/\b(?:src|href)=["'](https?:)?\/\//i.test(tag)) out.push(tag);
  }
  return out;
}

function hasId(html, id) {
  return new RegExp(`\\bid=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(html);
}

/** Resolve a relative target against a page path; directories map to index.html. */
function targetFile(pageFile, rel) {
  const base = posix.dirname(pageFile);
  let p = posix.normalize(posix.join(base, rel));
  if (p === "." || p === "") p = "index.html";
  if (rel.endsWith("/") || !posix.basename(p).includes(".")) p = posix.join(p, "index.html");
  return p;
}

export async function checkPage(file, html, readOther) {
  const problems = [];
  for (const { value } of extractRefs(html)) {
    if (SKIP.test(value)) continue;
    const [pathWithQuery, hash] = value.split("#");
    const path = pathWithQuery.split("?")[0];   // ?v=<hash> cache-busting queries do not change the file
    if (path === "") {
      if (!hasId(html, hash)) problems.push(`${file}: anchor #${hash} not found in page`);
      continue;
    }
    const target = targetFile(file, path);
    const other = await readOther(target);
    if (other === null) { problems.push(`${file}: ${value} -> ${target} does not exist`); continue; }
    if (hash !== undefined && !hasId(other, hash)) problems.push(`${file}: ${value} -> #${hash} not found in ${target}`);
  }
  return problems;
}

/** Check every listed page; returns the list of problems (empty when clean). */
export async function checkAll(pages = PAGES) {
  const readOther = async (rel) => {
    try { return await readFile(resolve(ROOT, rel), "utf8"); }
    catch (e) { if (e.code === "ENOENT" || e.code === "EISDIR") return null; throw e; }
  };
  const problems = [];
  for (const p of pages) {
    const html = await readPage(p.file);
    problems.push(...(await checkPage(p.file, html, readOther)));
    for (const tag of externalCalls(html)) problems.push(`${p.file}: runtime external call: ${tag}`);
  }
  return problems;
}

if (isMain(import.meta.url)) {
  checkAll().then((problems) => {
    if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
    console.log(`links: ${PAGES.length} page(s) clean.`);
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
