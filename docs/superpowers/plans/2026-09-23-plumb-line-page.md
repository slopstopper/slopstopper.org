# plumb-line Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/plumb-line/` stub with the real landing page, introduce Plumb as an inlined, animated SVG rig, and record the palette decision in HQ.

**Architecture:** The stamp script learns an `inline:PATH` region so `assets/plumb.svg` stays an editable file yet lands inline in the page. Page prose is copied verbatim from the plumb-line README. Behaviour is CSS keyframes plus a small guarded block in `site.js`. Two tests pin the character's non-negotiables (head asymmetry, PL mark) by parsing the SVG.

**Tech Stack:** Node 20 ESM, `node:test`, inline SVG + CSS animations, Playwright MCP for browser verification. No dependencies.

**Spec:** `docs/superpowers/specs/2026-09-23-plumb-line-page-design.md`

## Global Constraints

- Every body sentence traces to README (slopstopper/plumb-line `main`, 2026-09-23) or HQ `episodes/ep01-this-is-plumb/README.md`; the PR carries the source table. New text: headings, link labels, pill text only.
- Plumb: asymmetric head (right wider and lower; right eye rx ≥ 1.35 × left), PL ligature chest mark, video palette, grounded idle (no rotation of the figure). Tested where parseable.
- No runtime external calls; `npm run check` green; reduced motion honoured.
- `assets/plumb.svg` ≤ 6144 bytes.
- Gutter plumb line hidden on this page.
- Commits end with the session's attribution lines.

## Review Focus

1. A page with an `inline:` region whose asset file is missing: the stamp must fail naming page and path. Test in Task 1.
2. Two `inline:` regions for the same asset on one page: both filled, idempotent. Test in Task 1.
3. `#law` already in the viewport on load (short viewport or anchor link `#law`): the flash must still fire exactly once. Browser check in Task 5.
4. Reduced motion: no keyframes running, flash degrades to colour change, no rays. Browser check via emulation in Task 5.
5. Dark theme: outline colour lightens but character colours do not change. Browser screenshot in Task 5.

---

## File structure

```
assets/plumb.svg                 new: the rig
plumb-line/index.html            rewritten body; head unchanged except description
site.css                         + hero grid, deeper grid, plumb animations, gutter hide
site.js                          + guarded Plumb behaviour block
scripts/stamp-chrome.mjs         + inline regions
test/stamp-chrome.test.mjs       + 3 tests
test/plumb-svg.test.mjs          new
test/fixtures/stamp/inline.html  new
test/fixtures/stamp/asset.svg    new
README.md                        + generated-regions row
(hq) brand/plumb-character.md    + dated amendment
```

---

### Task 1: `inline:` regions in the stamp script

**Files:**
- Modify: `scripts/stamp-chrome.mjs`
- Test: `test/stamp-chrome.test.mjs`, `test/fixtures/stamp/inline.html`, `test/fixtures/stamp/asset.svg`
- Modify: `README.md`

**Interfaces:**
- Produces: `inlineAssets(html: string, file: string, readAsset: (path) => Promise<string|null>): Promise<string>` — for every `<!-- inline:PATH -->…<!-- /inline:PATH -->` replaces the interior with `\n<asset contents trimmed>\n`; throws `Error("<file>: inline asset <PATH> does not exist")` when `readAsset` returns null. `stampPage` stays synchronous; `run` calls `inlineAssets` after `stampPage`.

- [ ] **Step 1: Fixtures and failing tests**

`test/fixtures/stamp/asset.svg`:
```
<svg id="x"><circle r="1"/></svg>
```
`test/fixtures/stamp/inline.html`:
```html
<body>
<!-- inline:test/fixtures/stamp/asset.svg -->
stale
<!-- /inline:test/fixtures/stamp/asset.svg -->
<p>{{root}}</p>
<!-- inline:test/fixtures/stamp/asset.svg -->
<!-- /inline:test/fixtures/stamp/asset.svg -->
</body>
```
Append to `test/stamp-chrome.test.mjs`:
```js
import { inlineAssets } from "../scripts/stamp-chrome.mjs";

const readAsset = async (p) => p.endsWith("asset.svg") ? `<svg id="x"><circle r="1"/></svg>\n` : null;

test("inlineAssets fills every region for the asset and is idempotent", async () => {
  const page = await readFile(new URL("./fixtures/stamp/inline.html", import.meta.url), "utf8");
  const once = await inlineAssets(page, "inline.html", readAsset);
  assert.equal((once.match(/<svg id="x">/g) || []).length, 2);
  assert.doesNotMatch(once, /stale/);
  assert.match(once, /<p>\{\{root\}\}<\/p>/);
  assert.equal(await inlineAssets(once, "inline.html", readAsset), once);
});

test("inlineAssets names page and path when the asset is missing", async () => {
  await assert.rejects(
    () => inlineAssets(`<!-- inline:assets/nope.svg --><!-- /inline:assets/nope.svg -->`, "plumb-line/index.html", readAsset),
    /plumb-line\/index\.html: inline asset assets\/nope\.svg does not exist/
  );
});

test("inlineAssets leaves a page with no inline regions untouched", async () => {
  assert.equal(await inlineAssets("<body>x</body>", "a.html", readAsset), "<body>x</body>");
});
```

- [ ] **Step 2: Run, expect 3 failures** — `node --test test/stamp-chrome.test.mjs` → `inlineAssets` is not exported.

- [ ] **Step 3: Implement** in `scripts/stamp-chrome.mjs`:
```js
const INLINE_OPEN = /<!-- inline:([^\s]+) -->/g;

export async function inlineAssets(html, file, readAsset) {
  const paths = [...new Set([...html.matchAll(INLINE_OPEN)].map((m) => m[1]))];
  let out = html;
  for (const p of paths) {
    const asset = await readAsset(p);
    if (asset === null) throw new Error(`${file}: inline asset ${p} does not exist`);
    const name = `inline:${p}`;
    const content = `\n${asset.trim()}\n`;
    // replace every occurrence of this region
    let cursor = 0;
    while (out.indexOf(`<!-- ${name} -->`, cursor) !== -1) {
      const a = out.indexOf(`<!-- ${name} -->`, cursor);
      const head = out.slice(0, a);
      const rest = replaceRegion(out.slice(a), name, content, file);
      out = head + rest;
      cursor = a + `<!-- ${name} -->`.length + content.length + `<!-- /${name} -->`.length;
    }
  }
  return out;
}
```
Add a default reader and wire into `run`:
```js
async function readAssetFromRoot(p) {
  try { return await readFile(resolve(ROOT, p), "utf8"); }
  catch (e) { if (e.code === "ENOENT") return null; throw e; }
}
// in run(): const stamped = stampPage(prev, templates, rootFor(p.depth), p.file);
//           const next = await inlineAssets(stamped, p.file, readAssetFromRoot);
```
Update the header comment to mention inline regions.

- [ ] **Step 4: Tests green** — `node --test` → 36 pass. `node scripts/stamp-chrome.mjs --check` → in sync (no inline regions exist yet).

- [ ] **Step 5: README row** — add to the generated-regions table:
`| Inlined asset | \`<!-- inline:PATH -->\` | \`scripts/stamp-chrome.mjs\` | the file at PATH (e.g. \`assets/plumb.svg\`) |`

- [ ] **Step 6: Commit** — `git add scripts/stamp-chrome.mjs test README.md && git commit -m "feat(stamp): inline:PATH regions so assets stay editable files"`

---

### Task 2: `assets/plumb.svg` and its tests

**Files:**
- Create: `assets/plumb.svg`, `test/plumb-svg.test.mjs`

**Interfaces:**
- Produces: element ids `plumb, antenna, bob, rays, head, head-shape, eye-l, eye-r, collar, body, body-shape, mark-pl, arm-l, arm-r, hand-heart, legs, feet`; CSS vars `--pl-head --pl-body --pl-trim --pl-green --pl-line --pl-amber` on `svg#plumb`; figure axis at x=300 (documented in the file).

- [ ] **Step 1: Failing tests** — `test/plumb-svg.test.mjs`:
```js
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
```

- [ ] **Step 2: Run** → all fail (file missing).

- [ ] **Step 3: Write `assets/plumb.svg`** (axis x=300; viewBox 0 0 600 900):
```svg
<svg id="plumb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" role="img" aria-labelledby="plumb-title"
     style="--pl-head:#2e9e3a;--pl-body:#ff9a1f;--pl-trim:#f47b12;--pl-green:#3fb043;--pl-line:#141414;--pl-amber:#fb9902">
  <!-- Plumb — vector reference. Figure axis x=300. Head is deliberately asymmetric:
       right side wider and lower, right eye larger (canon). Chest mark is the PL ligature. -->
  <title id="plumb-title">Plumb, the plumb-line character</title>
  <g fill="none" stroke="var(--pl-line)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <g id="antenna">
      <line x1="300" y1="152" x2="300" y2="218"/>
      <g id="rays" stroke="var(--pl-amber)" stroke-width="7" opacity="0">
        <line x1="300" y1="86" x2="300" y2="70"/><line x1="332" y1="100" x2="343" y2="88"/>
        <line x1="346" y1="130" x2="362" y2="130"/><line x1="268" y1="100" x2="257" y2="88"/>
        <line x1="254" y1="130" x2="238" y2="130"/><line x1="300" y1="176" x2="300" y2="190"/>
      </g>
      <circle id="bob" cx="300" cy="130" r="17" fill="var(--pl-green)"/>
    </g>
    <g id="head">
      <path id="head-shape" fill="var(--pl-head)"
        d="M 300 216 C 222 216 160 262 160 328 C 160 392 214 430 300 432 C 404 434 480 402 480 334 C 480 264 402 216 300 216 Z"/>
      <ellipse id="eye-l" cx="246" cy="326" rx="21" ry="29" fill="var(--pl-line)" stroke="none"/>
      <ellipse id="eye-r" cx="376" cy="318" rx="31" ry="43" fill="var(--pl-line)" stroke="none"/>
    </g>
    <rect id="collar" x="252" y="428" width="96" height="30" rx="14" fill="var(--pl-trim)"/>
    <g id="body">
      <path id="body-shape" fill="var(--pl-body)"
        d="M 300 456 C 226 456 186 520 181 600 C 176 690 230 746 300 748 C 370 746 424 690 419 600 C 414 520 374 456 300 456 Z"/>
      <path id="mark-pl" stroke-width="10"
        d="M 280 560 V 660 H 318 M 280 560 H 305 C 334 560 334 606 305 606 H 280"/>
    </g>
    <g id="arm-l">
      <path d="M 192 532 C 166 572 160 622 178 656"/>
      <circle cx="176" cy="664" r="13" fill="var(--pl-green)" stroke-width="7"/>
    </g>
    <g id="arm-r">
      <path d="M 408 532 C 434 572 440 622 422 656"/>
      <path id="hand-heart" fill="var(--pl-green)" stroke-width="7"
        d="M 424 678 C 402 662 406 638 424 648 C 442 638 446 662 424 678 Z"/>
    </g>
    <g id="legs" fill="var(--pl-trim)">
      <rect x="262" y="736" width="30" height="58" rx="12"/>
      <rect x="308" y="736" width="30" height="58" rx="12"/>
    </g>
    <g id="feet" fill="var(--pl-green)">
      <ellipse cx="268" cy="800" rx="38" ry="18"/>
      <ellipse cx="332" cy="800" rx="38" ry="18"/>
    </g>
  </g>
</svg>
```

- [ ] **Step 4: Run tests** → 41 pass. Open the file in a browser (`python3 -m http.server`) and screenshot it for a first look; adjust curves only if something is clearly wrong (the owner's judgement comes at Task 5).

- [ ] **Step 5: Commit** — `git add assets/plumb.svg test/plumb-svg.test.mjs && git commit -m "feat: Plumb vector rig with asymmetry and PL-mark tests"`

---

### Task 3: Page content and layout CSS

**Files:**
- Modify: `plumb-line/index.html` (body), `site.css`

- [ ] **Step 1: Rewrite the body of `plumb-line/index.html`** between the chrome markers (keep head; set `<meta name="description" content="Values that remember where they came from, and review tooling that detects when they don't.">`):

```html
<div class="wrap">
  <main>
  <section class="hero plhero" id="top">
    <div class="plfig">
<!-- inline:assets/plumb.svg -->
<!-- /inline:assets/plumb.svg -->
    </div>
    <div>
      <p class="eyebrow">01 / plumb-line</p>
      <h1 class="plh1">Values that remember where they came from, and review tooling that detects when they don't.</h1>
      <p class="sub"><b>So you'll know it's dirty before it's a decision.</b></p>
      <div class="pills">
        <span class="pill live">● in use</span><span class="pill" data-sync="version:plumb-line">v0.11.1</span>
        <span class="pill">JS + Python</span><span class="pill">zero deps</span>
      </div>
      <div class="cta">
        <a class="btn pri" href="#install">Install <span class="arr">→</span></a>
        <a class="btn" href="https://github.com/slopstopper/plumb-line" target="_blank" rel="noopener">Repository <span class="arr">↗</span></a>
      </div>
    </div>
  </section>

  <section id="problem">
    <div class="snum"><b>§01</b>the problem</div>
    <p class="eyebrow">Where values come from</p>
    <h2>Once it is in a variable, they all look the same.</h2>
    <p class="lead">Every value in a program came from somewhere: a database, an API call, a test fixture, a default, a guess. Once it is sitting in a variable they all look the same. That is how a stubbed service answers "success" and the tests go green, how a guessed field flows into a report, and how a fallback an agent wrote to get a test passing ends up behind the dashboard, weeks after anyone remembers it is a fallback.</p>
    <p>plumb-line finds those places, and can stop new ones from appearing. A set of review-time tools (a Claude Code audit skill, lint rules, git hooks and a GitHub Action) checks a repository or a pull request for mocks treated as real, guesses treated as facts, and claims with nothing behind them. A small zero-dependency library for JavaScript and Python labels each value with where it came from and how much to trust it, and keeps the label attached through every derivation: a result built from a mock says so, and no later step can upgrade it.</p>
  </section>

  <section id="law">
    <div class="snum"><b>§02</b>the law</div>
    <p class="eyebrow">One rule underneath all of it</p>
    <h2>Combining values can keep or lower their trust level, never raise it.</h2>
    <div class="cmd law-code">
      <div class="h"><span>JavaScript · the same in Python</span><button class="copy" data-copy="const base  = mark(1000, { source: &quot;real&quot;, confidence: &quot;high&quot; });&#10;const rate  = mark(1.25, { source: &quot;mock&quot;, confidence: &quot;low&quot; });&#10;const total = derive([base, rate], (a, r) =&gt; a * r);&#10;&#10;total.derivedFromMock; // true&#10;total.confidence;      // 'low'">Copy</button></div>
<pre>const base  = mark(1000, { source: "real", confidence: "high" });
const rate  = mark(1.25, { source: <span class="p">"mock"</span>, confidence: "low" });
const total = derive([base, rate], (a, r) =&gt; a * r);

total.derivedFromMock; <span class="c">// true   inherited from rate, and impossible to clear</span>
total.confidence;      <span class="c">// 'low'  only as certain as the weakest input</span></pre>
    </div>
    <p><code>mark</code> puts the labels on a value (<code>real</code>, <code>mock</code>, <code>inferred</code>, <code>fallback</code>; confidence <code>high</code> down to <code>none</code>). <code>derive</code> runs your own function on labelled values and carries the labels through, keeping the weakest. The library never does the arithmetic and never changes a value; it only keeps the labels honest.</p>
  </section>

  <section id="fit">
    <div class="snum"><b>§03</b>fit</div>
    <p class="eyebrow">Who it's for</p>
    <h2>You probably want this if…</h2>
    <p class="lead">AI agents write or modify your code; if mocks, fixtures, fallbacks or synthetic values sit anywhere between an input and an output; or if your outputs are claims: a figure in a paper, a risk score, a forecast, a "safe to proceed". Common in agent-built systems, research code, data and ML pipelines, and inherited codebases.</p>
    <p>If your app reads a trusted database and shows what it finds, you probably don't need the run-time layer; the <a href="https://github.com/slopstopper/plumb-line/blob/main/reference/fit-map.md" target="_blank" rel="noopener">fit map</a> says so plainly.</p>
  </section>

  <section id="install" class="install">
    <div class="snum"><b>§04</b>get it</div>
    <p class="eyebrow">Three routes</p>
    <h2>Install.</h2>
    <div class="grid">
      <div class="cmd">
        <div class="h"><span>As a Claude Code plugin</span><button class="copy" data-copy="/plugin marketplace add slopstopper/plumb-line&#10;/plugin install plumb-line@plumb-line">Copy</button></div>
<pre><span class="p">/plugin</span> marketplace add slopstopper/plumb-line
<span class="p">/plugin</span> install plumb-line@plumb-line</pre>
      </div>
      <div class="cmd">
        <div class="h"><span>The library</span><button class="copy" data-copy="npm install plumb-line-provenance&#10;pip install plumb-line-provenance">Copy</button></div>
<pre><span class="p">npm</span> install plumb-line-provenance
<span class="p">pip</span> install plumb-line-provenance</pre>
      </div>
    </div>
    <p class="aside">Then run <code>plumb-line-adopt</code>. It looks at your repository and tells you which parts of plumb-line fit and what to run first. Updates arrive through <code>/plugin</code>. Zero dependencies. You can also copy <code>primitives/js/</code> or <code>primitives/python/</code> straight into your project.</p>
    <p class="aside"><b>In CI.</b> Add the <a href="https://github.com/slopstopper/plumb-line/blob/main/ACTION.md" target="_blank" rel="noopener">GitHub Action</a>. On every pull request it runs the checks your <code>.plumb-line/enforcement.json</code> manifest names and writes one SARIF log, with no agent involved. <b>Not using Claude?</b> <a href="https://github.com/slopstopper/plumb-line/blob/main/portable/README.md" target="_blank" rel="noopener">portable/README.md</a> is the entry point without the plugin.</p>
  </section>

  <section id="deeper">
    <div class="snum"><b>§05</b>go deeper</div>
    <p class="eyebrow">Already installed?</p>
    <h2>The repository is the documentation.</h2>
    <ul class="deeper">
      <li><a href="https://github.com/slopstopper/plumb-line/blob/main/primitives/SPEC.md" target="_blank" rel="noopener">Envelope spec <span class="arr">↗</span></a></li>
      <li><a href="https://github.com/slopstopper/plumb-line/blob/main/reference/fit-map.md" target="_blank" rel="noopener">Fit map <span class="arr">↗</span></a></li>
      <li><a href="https://github.com/slopstopper/plumb-line/blob/main/ACTION.md" target="_blank" rel="noopener">GitHub Action <span class="arr">↗</span></a></li>
      <li><a href="https://github.com/slopstopper/plumb-line/tree/main/docs/postmortems" target="_blank" rel="noopener">Postmortems <span class="arr">↗</span></a></li>
      <li><a href="https://github.com/slopstopper/plumb-line/blob/main/docs/threat-model.md" target="_blank" rel="noopener">Threat model <span class="arr">↗</span></a></li>
      <li><a href="https://github.com/slopstopper/plumb-line#what-the-audit-writes" target="_blank" rel="noopener">What the audit writes <span class="arr">↗</span></a></li>
      <li><a href="https://github.com/slopstopper/plumb-line/blob/main/primitives/README.md" target="_blank" rel="noopener">Primitives and the badge <span class="arr">↗</span></a></li>
      <li><a href="https://slopstopper.github.io/plumb-line/feedback.html" target="_blank" rel="noopener" data-todo="feedback-move">Private feedback <span class="arr">↗</span></a></li>
    </ul>
  </section>

  <section id="writing" class="writing">
    <div class="snum"><b>§06</b>writing</div>
    <p class="eyebrow">Write-ups</p>
    <h2>What shipped, with receipts.</h2>
    <p class="lead">One short piece per release, drafted from the shipped artifacts and
      passed through the same audit gate as the code. Machine-drafted, owner-edited,
      sources listed on every piece. This list is generated from the plumb-line repository.</p>
    <ul class="pieces">
<!-- writing:list -->
<!-- /writing:list -->
    </ul>
  </section>
  </main>
</div>
```
(The heading "Once it is in a variable, they all look the same." and "You probably want this if…" are README phrases; "The repository is the documentation." and "Three routes" are new heading text: mark as `draft` in the PR table.)

- [ ] **Step 2: CSS** — append to `site.css`:
```css
/* ---------- plumb-line page ---------- */
.plhero{display:grid; grid-template-columns:minmax(150px,240px) 1fr; gap:clamp(1.5rem,4vw,3.5rem); align-items:center}
.plfig{display:flex; justify-content:center}
.plfig svg{width:100%; max-width:240px; height:auto; display:block; overflow:visible}
.plh1{font-size:clamp(1.6rem,3.2vw,2.6rem); line-height:1.15; letter-spacing:-.01em; margin:0 0 1.2rem}
@media(max-width:720px){.plhero{grid-template-columns:1fr} .plfig svg{max-width:170px}}
.law-code{margin:1.6rem 0} .law-code pre .c{color:var(--muted)}
.deeper{list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:.7rem}
.deeper a{display:flex; justify-content:space-between; align-items:center; gap:.5rem; padding:.85rem 1rem;
  border:1px solid var(--hair-strong); border-radius:3px; color:var(--fg); font-family:var(--mono); font-size:.8rem}
.deeper a:hover{color:var(--red); border-color:var(--red)}
/* one plumb thing per page: hide the gutter line where Plumb stands */
body[data-page="plumb-line"] .plumb, body[data-page="plumb-line"] .plumb-mark{display:none}
```

- [ ] **Step 3: Stamp, sync, check**:
```bash
node scripts/stamp-chrome.mjs && SYNC_OFFLINE=1 node scripts/sync-writing.mjs && npm run check
```
Expected: stamp reports `plumb-line/index.html`; check all green; `grep -c 'id="plumb"' plumb-line/index.html` → 1.

- [ ] **Step 4: Commit** — `git add plumb-line/index.html site.css && git commit -m "feat(plumb-line page): landing content from README, Plumb inlined, gutter line hidden"`

---

### Task 4: Behaviour

**Files:**
- Modify: `site.css` (keyframes), `site.js` (guarded block)

- [ ] **Step 1: CSS**:
```css
/* ---------- Plumb: grounded idle, detection flash, wave ---------- */
#plumb{--pl-line-dark:#2a2a2e}
[data-theme="dark"] #plumb{--pl-line:var(--pl-line-dark)}
#plumb #head,#plumb #body{transform-box:view-box; transform-origin:300px 800px; animation:pl-breathe 4s ease-in-out infinite}
#plumb{animation:pl-shift 6s ease-in-out infinite}
#plumb #eye-l,#plumb #eye-r{transform-box:fill-box; transform-origin:center; animation:pl-blink 4s infinite}
#plumb #eye-r{animation-delay:.05s}
#plumb #bob{transition:fill .08s}
#plumb.detect #bob{fill:var(--pl-amber)}
#plumb.detect #rays{transform-box:fill-box; transform-origin:center; animation:pl-rays 1.2s ease-out forwards}
#plumb #arm-r{transform-box:view-box; transform-origin:408px 532px}
#plumb.wave #arm-r{animation:pl-wave .8s ease-in-out}
@keyframes pl-breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.015)}}
@keyframes pl-shift{0%,100%{transform:translateX(0)}50%{transform:translateX(1.2px)}}
@keyframes pl-blink{0%,93%,100%{transform:scaleY(1)}95.5%,97%{transform:scaleY(.06)}}
@keyframes pl-rays{0%{opacity:0;transform:scale(.6)}25%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.1)}}
@keyframes pl-wave{0%,100%{transform:rotate(0)}50%{transform:rotate(-25deg)}}
@media(prefers-reduced-motion:reduce){
  #plumb,#plumb #head,#plumb #body,#plumb #eye-l,#plumb #eye-r{animation:none}
  #plumb.detect #rays{animation:none; opacity:0}
  #plumb.wave #arm-r{animation:none}
}
```

- [ ] **Step 2: JS** — append to `site.js` (inside a new IIFE):
```js
// ---- Plumb (plumb-line page) ----
(function(){
  var fig=document.getElementById('plumb'); if(!fig) return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // detection flash: once, when the law block is 40% in view
  var law=document.getElementById('law'), fired=false;
  function flash(){
    if(fired) return; fired=true;
    fig.classList.add('detect');
    setTimeout(function(){ fig.classList.remove('detect'); }, reduce ? 900 : 1200);
  }
  if(law){
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){
        es.forEach(function(en){ if(en.intersectionRatio>=0.4){ flash(); io.disconnect(); } });
      }, {threshold:[0.4]});
      io.observe(law);
    } else { flash(); }
  }
  // wave on hover / tap
  if(!reduce){
    var waving=false;
    function wave(){ if(waving) return; waving=true; fig.classList.add('wave');
      setTimeout(function(){ fig.classList.remove('wave'); waving=false; }, 800); }
    fig.addEventListener('pointerenter', wave);
    fig.addEventListener('click', wave);
  }
})();
```

- [ ] **Step 3: Static checks** — `npm test && npm run check` green; `node -e "new Function(require('fs').readFileSync('site.js','utf8'))"` parses.

- [ ] **Step 4: Commit** — `git add site.css site.js && git commit -m "feat(plumb): grounded idle, once-only amber flash on the law block, wave on hover"`

---

### Task 5: Browser verification, screenshots, PR

- [ ] **Step 1: Serve** `python3 -m http.server 8768` and open `/plumb-line/` in Playwright.
- [ ] **Step 2: Assert**: 0 console errors; `#plumb` present; `.plumb` gutter hidden (`getComputedStyle(...).display==='none'`); scroll `#law` into view → `#plumb.classList.contains('detect')` true within 200 ms, then false after 1.5 s; scrolling away and back does not re-add it; hovering `#plumb` adds `wave`.
- [ ] **Step 3: Review Focus 3** — reload with `#law` in the URL: detect fires once.
- [ ] **Step 4: Review Focus 4** — emulate `prefers-reduced-motion: reduce`: `getComputedStyle(head).animationName==='none'`; flash still toggles bob fill; rays opacity stays 0.
- [ ] **Step 5: Screenshots** — hero in light and dark (toggle via `#ttog`) at 1200×800 and 390×844; save under `.playwright-mcp/` then move to `$CLAUDE_JOB_DIR/tmp/plumb-shots/`. Also full-page light.
- [ ] **Step 6: PR** — push branch `plumb-line-page`, `gh pr create --draft` with: the source table (sentence → README section / HQ file; `draft` for the two new headings), the screenshots attached via `gh pr comment` with image uploads or embedded from a comment, and the explicit line "Owner approval of the hero screenshots is the merge gate (spec §Acceptance)."

---

### Task 6: HQ brand-doc amendment

**Files:**
- Modify (repo `~/slopstopper-hq`): `brand/plumb-character.md`

- [ ] **Step 1: Append**:
```markdown
## 2026-09-23 — site palette and rig (owner decisions, slopstopper.org sub-project 2)

- The **site** follows the **video** palette, not the canon drawings: body
  orange `#ff9a1f`, collar/legs `#f47b12`, head green `#2e9e3a`, hands/feet
  and bob-at-rest `#3fb043`, outline `#141414`, amber flash `#fb9902`
  (sampled from the ep01 TikTok cut). The yellow-body line above stays as
  the drawing canon; superseded for the site only.
- Vector reference: `slopstopper.org/assets/plumb.svg` (repo
  slopstopper/slopstopper.org). Editable; tests there pin the asymmetric
  head and the PL chest mark.
- The chest mark is the **PL ligature** (P whose stem runs into an L-foot),
  not a plain P.
- **Idle is grounded.** Plumb stands and walks; the bob on its head *is*
  the plumb-bob. No pendulum sway. Parked idea: if a pendulum Plumb is ever
  tried on the site, it replaces the page's gutter plumb bob rather than
  sitting beside it.
```
- [ ] **Step 2: Commit on a branch `brand-site-palette`, push, open a small PR** in `slopstopper/hq` (owner merges).
