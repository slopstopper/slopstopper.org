import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function hasRegion(html, name) {
  return html.includes(`<!-- ${name} -->`);
}

/** Replace the interior of <!-- name --> … <!-- /name -->, keeping the markers. */
export function replaceRegion(html, name, content, file) {
  const open = `<!-- ${name} -->`;
  const close = `<!-- /${name} -->`;
  const a = html.indexOf(open);
  if (a === -1) throw new Error(`${file}: missing region ${name}`);
  const b = html.indexOf(close, a + open.length);
  if (b === -1) throw new Error(`${file}: unterminated region ${name}`);
  return html.slice(0, a + open.length) + content + html.slice(b);
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function readPage(file) {
  try {
    return await readFile(resolve(ROOT, file), "utf8");
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error(`${file}: page listed in scripts/pages.mjs does not exist`);
    }
    throw e;
  }
}

/** Write `next` to `file` unless in check mode. Returns true if it differed from `prev`. */
export async function writeIfChanged(file, next, prev, check) {
  if (next === prev) return false;
  if (!check) await writeFile(resolve(ROOT, file), next);
  return true;
}

/** True when this module was invoked directly as the CLI entry point. */
export function isMain(importMetaUrl) {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(importMetaUrl);
}
