import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isPiece, titleOf, sortPieces, renderRows, collect } from "../scripts/sync-writing.mjs";
import { replaceRegion } from "../scripts/lib.mjs";

test("isPiece keeps dated markdown and skips templates", () => {
  assert.equal(isPiece("2026-09-20-plumb-line-0.11.1-measured-nothing.md"), true);
  assert.equal(isPiece("TEMPLATE.md"), false);
  assert.equal(isPiece("WATCHER.md"), false);
  assert.equal(isPiece("2026-09-20-notes.txt"), false);
  assert.equal(isPiece("README.md"), false);
});

test("titleOf takes the first H1 and returns null without one", () => {
  assert.equal(titleOf("# plumb-line 0.11.1 — a green job\n\nbody"), "plumb-line 0.11.1 — a green job");
  assert.equal(titleOf("intro\n\n## not h1"), null);
  assert.equal(titleOf("   # indented is not a heading"), null);
});

test("sortPieces orders newest first with slug as tiebreak", () => {
  const out = sortPieces([
    { date: "2026-08-15", slug: "a" },
    { date: "2026-09-20", slug: "b" },
    { date: "2026-09-20", slug: "c" },
  ]);
  assert.deepEqual(out.map((p) => p.slug), ["c", "b", "a"]);
});

test("renderRows escapes titles", () => {
  const html = renderRows([{ date: "2026-01-02", title: `a < b & "c"`, url: "https://x/y" }]);
  assert.match(html, /a &lt; b &amp; &quot;c&quot;/);
  assert.match(html, /<span class="d">2026-01-02<\/span>/);
  assert.match(html, /href="https:\/\/x\/y" target="_blank" rel="noopener"/);
});

test("renderRows is stable and replaces a stale list", async () => {
  const page = await readFile(new URL("./fixtures/writing/list.html", import.meta.url), "utf8");
  const rows = renderRows([{ date: "2026-01-02", title: "t", url: "u" }]);
  const out = replaceRegion(page, "writing:list", rows, "list.html");
  assert.doesNotMatch(out, /stale/);
  assert.equal(replaceRegion(out, "writing:list", rows, "list.html"), out);
});

test("collect lists, filters, fetches titles, and skips files without a heading", async () => {
  const warned = [];
  const orig = console.warn; console.warn = (m) => warned.push(m);
  try {
    const fetchImpl = async (url) => {
      if (url.endsWith("/contents/docs/content")) return { ok: true, status: 200, json: async () => [
        { name: "TEMPLATE.md", download_url: "d/T", html_url: "h/T" },
        { name: "2026-08-15-plumb-line-0.9.0-the-front-door.md", download_url: "d/a", html_url: "h/a" },
        { name: "2026-09-20-no-heading.md", download_url: "d/b", html_url: "h/b" },
      ] };
      if (url === "d/a") return { ok: true, status: 200, text: async () => "# plumb-line 0.9.0 — the front door\n" };
      if (url === "d/b") return { ok: true, status: 200, text: async () => "no heading here\n" };
      throw new Error("unexpected " + url);
    };
    const out = await collect(fetchImpl);
    assert.deepEqual(out, [{
      date: "2026-08-15",
      slug: "plumb-line-0.9.0-the-front-door",
      title: "plumb-line 0.9.0 — the front door",
      url: "h/a",
    }]);
    assert.equal(warned.length, 1);
    assert.match(warned[0], /2026-09-20-no-heading\.md/);
  } finally { console.warn = orig; }
});

test("collect returns null on HTTP 403 or network failure", async () => {
  const orig = console.warn; console.warn = () => {};
  try {
    assert.equal(await collect(async () => ({ ok: false, status: 403 })), null);
    assert.equal(await collect(async () => { throw new Error("ENOTFOUND"); }), null);
  } finally { console.warn = orig; }
});

test("collect is offline when SYNC_OFFLINE=1 and never calls fetch", async () => {
  process.env.SYNC_OFFLINE = "1";
  const orig = console.warn; console.warn = () => {};
  try {
    let called = false;
    assert.equal(await collect(async () => { called = true; }), null);
    assert.equal(called, false);
  } finally { delete process.env.SYNC_OFFLINE; console.warn = orig; }
});
