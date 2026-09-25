import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../site.js", import.meta.url), "utf8");

// Owner (2026-09-25): Plumb's amber flash should answer a tap, not a scroll
// position. More intuitive as a page feature, even if it is not "detecting".
test("the detect flash is no longer tied to the law block scrolling into view", () => {
  assert.doesNotMatch(js, /getElementById\('law'\)/);
});

test("a tap on Plumb flashes detect and clears it after the rays animation", () => {
  assert.match(js, /function flash\(\)/);
  assert.match(js, /fig\.classList\.add\('detect'\)/);
  assert.match(js, /fig\.classList\.remove\('detect'\)/);
  assert.match(js, /pointerdown[^\n]*\n?[^\n]*flash\(\)/);
});
