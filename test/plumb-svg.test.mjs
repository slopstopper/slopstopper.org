import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const FILE = new URL("../assets/plumb.svg", import.meta.url);
const svg = await readFile(FILE, "utf8").catch(() => "");
const attr = (id, name) => {
  const m = svg.match(new RegExp(`<[a-z]+[^>]*\\bid="${id}"[^>]*>`));
  if (!m) return null;
  const a = m[0].match(new RegExp(`\\b${name}="([^"]+)"`));
  return a ? a[1] : null;
};

test("required ids exist", () => {
  for (const id of ["plumb","antenna","bob","rays","head","head-shape","eye-l","eye-r","collar","body","body-shape","mark-pl","arm-l","arm-r","hand-heart","legs","feet"]) {
    assert.ok(svg.includes(`id="${id}"`), id);
  }
});

test("right eye is at least 1.35x the left (canon asymmetry)", () => {
  const l = parseFloat(attr("eye-l", "rx")), r = parseFloat(attr("eye-r", "rx"));
  assert.ok(r >= 1.35 * l, `eye-r rx ${r} vs eye-l rx ${l}`);
});

test("head is wider on the right of the figure axis (x=300)", () => {
  const d = attr("head-shape", "d");
  const xs = [...d.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1]));
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const right = maxX - 300, left = 300 - minX;
  assert.ok(right - left >= 0.08 * (maxX - minX), `right ${right} left ${left}`);
});

test("chest mark is a stroke path and the P bowl sits on the stem's right", () => {
  const d = attr("mark-pl", "d");
  assert.ok(d && /M\s*280[ ,]/.test(d), "stem starts at x=280");
  assert.ok(/H\s*3\d\d/.test(d), "bowl and foot extend to the right");
});

test("no scripts, images or external urls; under 6 KB", async () => {
  assert.doesNotMatch(svg, /<script|<image|url\(https?:/);
  assert.ok((await stat(FILE)).size <= 6144);
});
