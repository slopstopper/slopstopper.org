import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../plumb-line/feedback/index.html", import.meta.url), "utf8").catch(() => "");

test("form posts to the existing Formspree endpoint with subject, honeypot and on-site return", () => {
  assert.match(html, /<form[^>]+action="https:\/\/formspree\.io\/f\/mwvdqwpe"[^>]+method="POST"/);
  assert.match(html, /name="_subject"/);
  assert.match(html, /name="_gotcha"/);
  assert.match(html, /name="_next"\s+value="https:\/\/slopstopper\.org\/plumb-line\/feedback\/\?sent=1"/);
});

test("form keeps the original fields", () => {
  for (const n of ["email", "parts", "language", "domain", "domain_other", "loc", "version", "what_it_caught", "lint_output", "friction", "bugs", "anything_else", "may_quote"]) {
    assert.ok(html.includes(`name="${n}"`), n);
  }
});

test("form links to the privacy notice and has a sent panel; email is optional", () => {
  assert.match(html, /href="\.\.\/\.\.\/privacy\/"/);
  assert.match(html, /id="sent"/);
  assert.match(html, /optional/i);
  assert.doesNotMatch(html, /<input[^>]+name="email"[^>]+required/);
});

test("page loads nothing from a third party on view", () => {
  assert.doesNotMatch(html, /<(script|link|img|iframe)[^>]+(src|href)="https?:\/\//);
});
