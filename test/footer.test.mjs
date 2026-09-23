import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tpl = await readFile(new URL("../templates/footer.html", import.meta.url), "utf8");
const home = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("footer links to the social accounts, feedback, writing, privacy, contact and source", () => {
  for (const s of ["tiktok.com/@slopstopperskills", "instagram.com/slopstopperskills", "youtube.com/@slopstopperskills", "{{root}}plumb-line/feedback/", "{{root}}plumb-line/#writing", "{{root}}privacy/", "mailto:slopstopperskills@gmail.com", "github.com/slopstopper/slopstopper.org"]) {
    assert.ok(tpl.includes(s), s);
  }
});

test("colophon claims only what is true", () => {
  assert.doesNotMatch(tpl, /no runtime external calls/);
  assert.match(tpl, /nothing loaded from third parties on view/);
});

test("home page keeps the poem and the status line verbatim, and features plumb-line with Plumb peeking", () => {
  assert.match(home, /Coherent doesn't mean it's <span class="k">correct<\/span>/);
  assert.match(home, /None of this stops you from shipping <span class="s">slop<\/span>\. It just\s+makes it visible, attributable, and slightly embarrassing\./);
  assert.match(home, /<a class="tool featured" href="plumb-line\/">/);
  assert.match(home, /<!-- inline:assets\/plumb-peek\.svg -->/);
  assert.match(home, /Slop used to be obvious\./);
  assert.doesNotMatch(home, /id="risks"|id="more"/);
});
