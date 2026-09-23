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

import { inlineAssets } from "../scripts/stamp-chrome.mjs";

const readAsset = async (p) => p.endsWith("asset.svg") ? `<svg id="x"><circle r="1"/></svg>\n` : null;

test("inlineAssets fills every region for the asset and is idempotent", async () => {
  const page = await readFile(new URL("./fixtures/stamp/inline.html", import.meta.url), "utf8");
  const once = await inlineAssets(page, "inline.html", readAsset);
  assert.equal((once.match(/<svg id="x">/g) || []).length, 2);
  assert.doesNotMatch(once, /stale/);
  assert.match(once, /<p>\{\{root\}\}<\/p>/);
  assert.equal(await inlineAssets(once, "inline.html", readAsset), once);
});

test("inlineAssets names page and path when the asset is missing", async () => {
  await assert.rejects(
    () => inlineAssets(`<!-- inline:assets/nope.svg --><!-- /inline:assets/nope.svg -->`, "plumb-line/index.html", readAsset),
    /plumb-line\/index\.html: inline asset assets\/nope\.svg does not exist/
  );
});

test("inlineAssets leaves a page with no inline regions untouched", async () => {
  assert.equal(await inlineAssets("<body>x</body>", "a.html", readAsset), "<body>x</body>");
});

import { fingerprintAssets } from "../scripts/stamp-chrome.mjs";

const readHash = async (p) => ({ "site.css": "aaaaaaaa", "site.js": "bbbbbbbb" })[p] || null;

test("fingerprintAssets adds ?v=<hash> to site.css and site.js links at any depth", async () => {
  const page = `<link rel="stylesheet" href="../site.css">\n<script src="../site.js"></script>\n<link rel="icon" href="../assets/favicon.svg">`;
  const out = await fingerprintAssets(page, "plumb-line/index.html", readHash);
  assert.match(out, /href="\.\.\/site\.css\?v=aaaaaaaa"/);
  assert.match(out, /src="\.\.\/site\.js\?v=bbbbbbbb"/);
  assert.match(out, /href="\.\.\/assets\/favicon\.svg"/);
});

test("fingerprintAssets replaces a stale hash and is idempotent", async () => {
  const page = `<link rel="stylesheet" href="site.css?v=00000000"><script src="site.js?v=deadbeef"></script>`;
  const once = await fingerprintAssets(page, "index.html", readHash);
  assert.equal(once, `<link rel="stylesheet" href="site.css?v=aaaaaaaa"><script src="site.js?v=bbbbbbbb"></script>`);
  assert.equal(await fingerprintAssets(once, "index.html", readHash), once);
});

test("fingerprintAssets fails naming the page when an asset is missing", async () => {
  await assert.rejects(
    () => fingerprintAssets(`<script src="site.js"></script>`, "privacy/index.html", async () => null),
    /privacy\/index\.html: asset site\.js does not exist/
  );
});
