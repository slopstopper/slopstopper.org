import { test } from "node:test";
import assert from "node:assert/strict";
import { replaceRegion, hasRegion, escapeHtml } from "../scripts/lib.mjs";

const page = `<body>\n<!-- chrome:header -->old\n<!-- /chrome:header -->\n<main/>`;

test("replaceRegion swaps the interior and keeps markers", () => {
  const out = replaceRegion(page, "chrome:header", "\nNEW\n", "p.html");
  assert.equal(out, `<body>\n<!-- chrome:header -->\nNEW\n<!-- /chrome:header -->\n<main/>`);
});

test("replaceRegion is idempotent", () => {
  const once = replaceRegion(page, "chrome:header", "\nNEW\n", "p.html");
  const twice = replaceRegion(once, "chrome:header", "\nNEW\n", "p.html");
  assert.equal(once, twice);
});

test("replaceRegion throws naming file and region when marker missing", () => {
  assert.throws(
    () => replaceRegion("<body></body>", "chrome:footer", "x", "plumb-line/index.html"),
    /plumb-line\/index\.html: missing region chrome:footer/
  );
});

test("replaceRegion throws when close marker missing", () => {
  assert.throws(
    () => replaceRegion("<!-- chrome:header -->x", "chrome:header", "y", "a.html"),
    /a\.html: unterminated region chrome:header/
  );
});

test("hasRegion", () => {
  assert.equal(hasRegion(page, "chrome:header"), true);
  assert.equal(hasRegion(page, "writing:list"), false);
});

test("escapeHtml escapes the four characters", () => {
  assert.equal(escapeHtml(`a & b < c > "d"`), `a &amp; b &lt; c &gt; &quot;d&quot;`);
});
