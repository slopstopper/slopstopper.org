import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGES, rootFor } from "../scripts/pages.mjs";

test("rootFor returns ./ at depth 0 and ../ per level", () => {
  assert.equal(rootFor(0), "./");
  assert.equal(rootFor(1), "../");
  assert.equal(rootFor(2), "../../");
});

test("every page has a unique file and data-page name", () => {
  const files = new Set(PAGES.map((p) => p.file));
  const names = new Set(PAGES.map((p) => p.page));
  assert.equal(files.size, PAGES.length);
  assert.equal(names.size, PAGES.length);
});

test("depth matches the number of slashes in the path", () => {
  for (const p of PAGES) {
    assert.equal(p.depth, p.file.split("/").length - 1, p.file);
  }
});
