import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { extractRefs, checkPage, externalCalls } from "../scripts/check-links.mjs";

const FIX = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/links");
const readOther = async (rel) => {
  try { return await readFile(resolve(FIX, rel), "utf8"); } catch { return null; }
};

test("extractRefs finds href and src", () => {
  const refs = extractRefs(`<a href="a">x</a><img src='b'><link href="c">`);
  assert.deepEqual(refs.map((r) => r.value), ["a", "b", "c"]);
});

test("a clean page has no problems", async () => {
  const html = await readFile(resolve(FIX, "ok/index.html"), "utf8");
  assert.deepEqual(await checkPage("ok/index.html", html, readOther), []);
});

test("a subpage resolves ../ and its own anchors", async () => {
  const html = await readFile(resolve(FIX, "ok/sub/index.html"), "utf8");
  assert.deepEqual(await checkPage("ok/sub/index.html", html, readOther), []);
});

test("broken anchors, missing paths and absent remote ids are reported", async () => {
  const html = await readFile(resolve(FIX, "bad/index.html"), "utf8");
  const problems = await checkPage("bad/index.html", html, readOther);
  assert.equal(problems.length, 3, problems.join("\n"));
  assert.match(problems[0], /#nope/);
  assert.match(problems[1], /missing\//);
  assert.match(problems[2], /#absent/);
});

test("externalCalls flags runtime third-party loads", async () => {
  const html = await readFile(resolve(FIX, "bad/index.html"), "utf8");
  assert.equal(externalCalls(html).length, 1);
  assert.equal(externalCalls(`<a href="https://ok">fine</a><img src="assets/x.png">`).length, 0);
});

test("a listed page that does not exist fails with the path, not a stack trace", async () => {
  const { checkAll } = await import("../scripts/check-links.mjs");
  await assert.rejects(
    () => checkAll([{ file: "ghost/index.html", page: "ghost", depth: 1 }]),
    /ghost\/index\.html: page listed in scripts\/pages\.mjs does not exist/
  );
});

test("a ?v= cache-busting query on a relative asset is ignored when resolving the file", async () => {
  const html = `<link rel="stylesheet" href="../site.css?v=abcdef12"><script src="../missing.js?v=1"></script>`;
  const problems = await checkPage("ok/sub/index.html", html, readOther);
  assert.equal(problems.length, 1, problems.join("\n"));
  assert.match(problems[0], /missing\.js/);
});
