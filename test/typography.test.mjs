import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../site.css", import.meta.url), "utf8");
const rule = (sel) => { const m = css.match(new RegExp(`(^|\\n|}|;)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)}`)); return m ? m[2] : null; };

// One fluid scale for the whole site: the clamp lives on the root so rem-sized
// text (labels, descs, asides) grows with the viewport like body copy does.
test("root font-size is fluid and body inherits it", () => {
  assert.match(rule("html") ?? "", /font-size:clamp\(/);
  assert.doesNotMatch(rule("body") ?? "", /font-size:clamp\(/);
});

// A clamp whose middle term is pure vw never engages below ~1500px: 1.4vw at
// 1440px is 20px, under the 1.12rem floor. Fluid terms need a rem base + vw.
for (const sel of [".lead", ".hero .sub"]) {
  test(`${sel} scales between its bounds`, () => {
    const fs = (rule(sel) ?? "").match(/font-size:clamp\(([^)]*)\)/)?.[1] ?? "";
    const mid = fs.split(",")[1] ?? "";
    assert.match(mid, /rem/, `middle term needs a rem base: ${fs}`);
    assert.match(mid, /vw/, `middle term needs a vw slope: ${fs}`);
  });
}

// The privacy rows override the tool row's padding; they must not zero the
// padding-left that moves text clear of the hover highlight bar.
test("privacy rows keep the hover offset that clears the highlight bar", () => {
  assert.doesNotMatch(rule(".privacy .tool") ?? "", /(^|;)\s*padding:/);
});

// The root scale must keep moving on large screens. With `.5vw + .92rem`
// capped at 1.12rem it stopped growing at 640px while the display headings
// (6.2vw, capped near 1200px) kept going, so a 2000px tablet got maxed-out
// headings over 640px-sized body copy.
test("root scale keeps growing past tablet widths", () => {
  const fs = (rule("html") ?? "").match(/font-size:clamp\(([^)]*)\)/)?.[1] ?? "";
  const [min, mid, max] = fs.split(",").map((s) => s.trim());
  const base = parseFloat(mid.match(/([\d.]+)rem/)?.[1] ?? "0");
  const slope = parseFloat(mid.match(/([\d.]+)vw/)?.[1] ?? "0");
  const cap = parseFloat(max);
  assert.ok(slope > 0 && base > 0, `middle term needs rem + vw: ${fs}`);
  const capReachedAt = ((cap - base) * 16) / (slope / 100);
  assert.ok(capReachedAt >= 1200, `scale stops at ${Math.round(capReachedAt)}px; want ≥1200 (${fs})`);
  assert.ok(parseFloat(min) >= 1, `floor below 1rem: ${fs}`);
});
