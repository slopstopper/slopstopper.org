import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderTemplate, stampPage } from "../scripts/stamp-chrome.mjs";

const templates = {
  header: `\n<header><a href="{{root}}">home</a><a href="{{root}}plumb-line/">pl</a></header>\n`,
  footer: `\n<footer><img src="{{root}}assets/mark.svg"></footer>\n`,
};

test("renderTemplate rewrites every {{root}} token", () => {
  assert.equal(renderTemplate(templates.header, "../"),
    `\n<header><a href="../">home</a><a href="../plumb-line/">pl</a></header>\n`);
});

test("stampPage replaces both regions and is idempotent", async () => {
  const page = await readFile(new URL("./fixtures/stamp/page.html", import.meta.url), "utf8");
  const once = stampPage(page, templates, "./", "page.html");
  assert.match(once, /<header><a href="\.\/">home<\/a>/);
  assert.match(once, /<footer><img src="\.\/assets\/mark\.svg">/);
  assert.doesNotMatch(once, /stale/);
  assert.equal(stampPage(once, templates, "./", "page.html"), once);
});

test("stampPage leaves body content untouched, including a literal {{root}} outside chrome", () => {
  const page = `<body><!-- chrome:header --><!-- /chrome:header --><p>{{root}}</p><!-- chrome:footer --><!-- /chrome:footer --></body>`;
  const out = stampPage(page, templates, "../", "p.html");
  assert.match(out, /<p>\{\{root\}\}<\/p>/);
});

test("stampPage fails naming the file when a region is missing", () => {
  assert.throws(
    () => stampPage(`<body><!-- chrome:header --><!-- /chrome:header --></body>`, templates, "./", "privacy/index.html"),
    /privacy\/index\.html: missing region chrome:footer/
  );
});
