import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../privacy/index.html", import.meta.url), "utf8");

test("privacy notice names the controller framing and the contact address", () => {
  assert.match(html, /an individual based in the UK/);
  assert.match(html, /slopstopperskills@gmail\.com/);
  assert.match(html, /on request/);
});

test("privacy notice names every processor and the regulator", () => {
  for (const s of ["GitHub Pages", "Cloudflare", "Formspree", "Information Commissioner"]) assert.ok(html.includes(s), s);
});

test("privacy notice states retention and rights, and is dated", () => {
  assert.match(html, /12 months/);
  assert.match(html, /erasure|delete/i);
  assert.match(html, /Last updated:?\s*<?[^>]*>?\s*2026-\d{2}-\d{2}/);
});

test("privacy notice is indexable and no longer a placeholder", () => {
  assert.doesNotMatch(html, /noindex/);
  assert.doesNotMatch(html, /Placeholder/);
});
