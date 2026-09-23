import { test } from "node:test";
import assert from "node:assert/strict";
import { display, patchPill, latestVersion } from "../scripts/sync-versions.mjs";

test("display normalises tags", () => {
  assert.equal(display("v0.7.0"), "v0.7");
  assert.equal(display("0.11.1"), "v0.11.1");
  assert.equal(display("release-1.2.3"), "v1.2.3");
  assert.equal(display("nightly"), "vnightly");
});

test("patchPill rewrites only the matching tool and reports change", () => {
  const html = `<span class="pill" data-sync="version:plumb-line">v0.1</span><span data-sync="version:tokenomics">v0.3</span>`;
  const r = patchPill(html, "plumb-line", "v0.11.1");
  assert.equal(r.changed, true);
  assert.match(r.html, /version:plumb-line">v0\.11\.1</);
  assert.match(r.html, /version:tokenomics">v0\.3</);
});

test("patchPill is a no-op when the page has no pill for that tool", () => {
  const r = patchPill(`<p>no pills</p>`, "plumb-line", "v1");
  assert.equal(r.changed, false);
  assert.equal(r.html, `<p>no pills</p>`);
});

test("latestVersion prefers releases/latest and falls back to tags", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.endsWith("/releases/latest")) return { ok: false, status: 404 };
    if (url.includes("/tags")) return { ok: true, json: async () => [{ name: "v0.3.2" }] };
    throw new Error("unexpected " + url);
  };
  assert.equal(await latestVersion("slopstopper/tokenomics", fetchImpl), "v0.3.2");
  assert.equal(calls.length, 2);
});

test("latestVersion returns null when the API is unreachable", async () => {
  const orig = console.warn; console.warn = () => {};
  try {
    const fetchImpl = async () => { throw new Error("ENOTFOUND"); };
    assert.equal(await latestVersion("x/y", fetchImpl), null);
  } finally { console.warn = orig; }
});
