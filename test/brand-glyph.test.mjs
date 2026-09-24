import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// The ≠ glyph, variant F (2026-09-24): red `=` bars (h16) drawn first, the
// text-colour strike (w21) drawn on top. Masters live in slopstopper/.github
// profile/; every copy here must carry the same geometry and order.
const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

const BAR = /<rect[^>]*y="37\.5"[^>]*height="16"[^>]*\/>\s*<rect[^>]*y="60\.5"[^>]*height="16"[^>]*\/>\s*<rect[^>]*width="21"[^>]*rotate\(24 50 57\)/;
const OLD = /height="11"|width="16" height="116"/;

for (const p of ["assets/favicon.svg", "assets/glyph.svg", "assets/mark.svg", "assets/logo-word-ink.svg", "assets/logo-word-light.svg"]) {
  test(`${p}: bars then strike, new weights, no old geometry`, async () => {
    const s = await read(p);
    assert.match(s, BAR);
    assert.doesNotMatch(s, OLD);
  });
  test(`${p}: bars are red, strike is not`, async () => {
    const s = await read(p);
    const bars = [...s.matchAll(/<rect[^>]*height="16"[^>]*fill="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(bars, ["#d1553f", "#d1553f"]);
    const strike = s.match(/<rect[^>]*width="21"[^>]*fill="([^"]+)"/)[1];
    assert.notEqual(strike, "#d1553f");
  });
}

for (const p of ["templates/header.html", "templates/footer.html", "index.html"]) {
  test(`${p}: inline wordmark uses the new glyph`, async () => {
    const s = await read(p);
    assert.match(s, BAR);
    assert.doesNotMatch(s, OLD);
  });
}

test("site.css fills the bars red and the strike in the text colour", async () => {
  const css = await read("site.css");
  assert.doesNotMatch(css, /\.wm-bar\{fill:var\(--fg\)\}/);
  assert.match(css, /\.wm-plumb\{fill:var\(--fg\)\}/);
  assert.match(css, /\.wm-bar\{fill:var\(--red\)\}/);
});
