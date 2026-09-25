import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../site.js", import.meta.url), "utf8");

// Owner (2026-09-25): the swing should go as high as it can and reward
// repeated taps. No gutter-derived angle cap, no small hard wall; the only
// stop is just short of horizontal, where a real string would go slack.
test("swing has no gutter-based or small hard angle cap", () => {
  assert.doesNotMatch(js, /maxSwing/);
  assert.doesNotMatch(js, /hardCap/);
});

test("swing may reach near horizontal and the velocity cap allows it", () => {
  const tmax = parseFloat(js.match(/THETA_MAX\s*=\s*([\d.]+)/)?.[1] ?? "0");
  const omax = parseFloat(js.match(/OMAX\s*=\s*([\d.]+)/)?.[1] ?? "0");
  const k = parseFloat(js.match(/\bK\s*=\s*([\d.]+)/)?.[1] ?? "0");
  assert.ok(tmax >= 1.4 && tmax < Math.PI / 2, `THETA_MAX ${tmax}`);
  // energy needed at the bottom to reach THETA_MAX: ω² = 2K(1 − cos θ)
  const need = Math.sqrt(2 * k * (1 - Math.cos(tmax)));
  assert.ok(omax >= need, `OMAX ${omax} cannot reach ${tmax} rad (needs ${need.toFixed(2)})`);
});

test("damping is light enough that taps accumulate", () => {
  const c = parseFloat(js.match(/\bC\s*=\s*([\d.]+)/)?.[1] ?? "9");
  assert.ok(c <= 0.8, `C ${c}`);
});

test("a tap adds energy in proportion to current speed, so rhythm reaches the stop", () => {
  assert.match(js, /PUMP\s*=\s*0?\.[2-5]\d*/);
  assert.match(js, /omega \+= dir\*\(KICK \+ PUMP\*Math\.abs\(omega\)\)/);
});
