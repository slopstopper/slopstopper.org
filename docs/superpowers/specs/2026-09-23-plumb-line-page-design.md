# slopstopper.org — the plumb-line page (sub-project 2 of 6)

Date: 2026-09-23. Status: approved in conversation; awaiting spec review.
Builds on sub-project 1 (`2026-09-23-site-foundation-design.md`): the stub
at `plumb-line/index.html`, the chrome stamp, the writing sync.

## Intent

Give plumb-line its home on the org site so the stale GitHub Pages site can
be retired (sub-project 3). The page is a **landing page first, with a
"go deeper" layer** that links into the repository's docs rather than
duplicating them (owner decision: option 3). It introduces **Plumb**, the
character from the video series, as a vector rig so the character is
editable and animatable long-term (owner decision: option 2, may be
revisited once seen).

## Decisions taken in brainstorming

| Decision | Choice | Rejected |
| --- | --- | --- |
| Audience | Deciding-to-install visitor first; installed visitor served by a link grid into repo docs | Pure landing; pure docs |
| Plumb medium | Vector SVG redraw, editable and animatable | Owner PNG exports as-is; PNG body + SVG bob |
| Plumb palette | The **video** palette (orange body, deeper flat green) so site and TikTok/Instagram agree | Canon-drawing yellow body |
| Plumb role | One hero Plumb; grounded idle; amber bob flash triggered by the taint example; wave on hover/tap | Per-section Plumbs; static Plumb |
| Idle motion | **Grounded**: Plumb stands and walks in the videos; the bob on its head *is* the plumb-bob. No pendulum sway (owner correction) | Rig-test sway around the bob tip |
| Gutter plumb line | Hidden on this page so two plumb things do not crowd the hero | Keep the home page's swinging line |
| Prose | Reused verbatim from owner-approved sources (README, HQ canon lines); new text limited to headings and link labels | Claude-written marketing copy |

## Constraints (inherit sub-project 1's, plus)

- Published prose is owner-written. Every body sentence on the page traces
  to a named source; the PR lists each. Anything not traceable is marked
  `draft` in the PR for the owner to accept or rewrite.
- No runtime external calls; `check-links` stays green.
- The character must remain recognisably the owner's drawing. Two
  features are **non-negotiable and tested**: the **asymmetric head** (right
  side wider and lower, right eye larger than the left, as in every canon
  image) and the **PL ligature** on the chest (a P whose stem runs down into
  an L-foot with a rounded end, the shape of `docs/logo.svg` in the repo,
  drawn the right way round).
- Reduced motion is honoured for every animation.

## Page structure

`plumb-line/index.html`, `<body data-page="plumb-line">`, seven blocks:

| § | Block | Content and source |
| --- | --- | --- |
| hero | Plumb (left) + headline (right) | H1: "Values that remember where they came from, and review tooling that detects when they don't." [README tagline]. Sub: "So you'll know it's dirty before it's a decision." [HQ ep01 README, graduated line; marked there as candidate for site use]. Pills: `data-sync="version:plumb-line"`, JS + Python, zero deps. Buttons: Install (`#install`), Repository. |
| 01 | The problem | README paragraphs 1–2 ("Every value in a program came from somewhere…" / "plumb-line finds those places…"), verbatim. |
| 02 | The law, with the example | "One rule sits underneath all of it: combining values can keep or lower their trust level, never raise it." + the six-line `mark`/`derive` JS sample, verbatim from README §The library. `id="law"`. **This block is the amber-flash trigger.** |
| 03 | Who it's for | README "You probably want this if…" paragraph verbatim, fit-map link kept. |
| 04 | Install | README §Install's three routes (plugin, library, CI Action) with the home page's copy buttons; the "Not using Claude?" line and portable link kept. |
| 05 | Go deeper | Link grid, titles only: SPEC, fit map, ACTION.md, postmortems, threat model, "What the audit writes" (README anchor), primitives README (conformance badge), private feedback form (current github.io URL until sub-project 3 moves it; `data-todo="feedback-move"`). |
| 06 | Writing | Existing generated `writing:list` block, unchanged. |

Section numbering runs 01–06 (the home page's § scheme, own sequence).
Head `<meta>` tags as the stub has; `description` = README tagline.

## The Plumb rig

`assets/plumb.svg`, a standalone editable file, **inlined** into the page by
the stamp script between `<!-- inline:assets/plumb.svg -->` /
`<!-- /inline:assets/plumb.svg -->` so CSS and JS can address its parts.
Target ≤ 6 KB. `viewBox="0 0 600 900"`. `role="img"`, `<title>Plumb, the
plumb-line character</title>`.

Structure (ids are the contract for CSS/JS):

```
svg#plumb
  g#antenna   line.stem, circle#bob, g#rays (6 short strokes, opacity 0)
  g#head      path#head-shape (asymmetric), ellipse#eye-l, ellipse#eye-r
  path#collar
  g#body      path#body-shape, path#mark-pl
  g#arm-l     path
  g#arm-r     path, path#hand-heart
  g#legs      two rounded rects
  g#feet      two ellipses
```

Palette, sampled from the reference video frames (`hq` will record these):
head green `#2e9e3a`, body orange `#ff9a1f`, collar/legs orange `#f47b12`,
feet/hands green `#3fb043`, outline `#141414`, bob rest green `#3fb043`,
bob flash amber `#fb9902`. Declared as CSS custom properties on `svg#plumb`
(`--pl-head`, `--pl-body`, …) with the same values in both themes; only
`--pl-line` lightens to `#2a2a2e` under `[data-theme="dark"]` so the outline
reads on ink. Uniform stroke width 9 (viewBox units), round joins, no rough
filter: the flat video look.

Proportions from the video pose: head ≈ 1.4× body width, wide rounded
blob, **right side wider and lower than the left**; small bob (r ≈ 16) on a
short stem; pear body; stubby legs; oval feet. Eyes: dark ovals, **right
rx/ry ≥ 1.35× left**. Chest mark: PL ligature, stroke-drawn, right-reading.

## Behaviour (CSS keyframes + ≈30 lines in `site.js`, all guarded by
`document.getElementById('plumb')`)

- **Idle (grounded)**: `#body` and `#head` breathe (`scaleY` 1.00→1.015,
  4 s, ease-in-out, transform-origin at the feet); the whole figure shifts
  weight ±1.2 px horizontally on a 6 s cycle; blink: both eyes `scaleY`
  1→0.06→1 over 120 ms every 4 s, right eye 50 ms after left. No rotation
  of the figure.
- **Detection flash**: `IntersectionObserver` on `#law`, threshold 0.4,
  once. Adds class `detect` to `svg#plumb`: `#bob` fill → amber over 80 ms,
  `#rays` scale 0.6→1 and opacity 0→1→0 over 1.2 s, bob returns to green
  at the end. Session-once via a closure flag (not storage).
- **Wave**: `pointerenter` / `click` on `svg#plumb` adds `wave` for 800 ms:
  `#arm-r` rotates −25° about its shoulder and back. Debounced (ignored
  while `wave` is set).
- **Reduced motion**: under `prefers-reduced-motion: reduce` there is no
  breathing, weight shift or blink; the flash is a plain 80 ms bob colour
  change with `#rays` kept hidden; wave is skipped.
- **Gutter plumb line**: `body[data-page="plumb-line"] .plumb, body[data-page="plumb-line"] .plumb-mark { display:none }` in `site.css`; the swing code already early-returns when `.plumb` is absent from layout (it checks the elements, and `display:none` gives zero height; verify no console errors).

## Automation touch-points

- `scripts/stamp-chrome.mjs` gains **inline regions**: for every
  `<!-- inline:PATH -->…<!-- /inline:PATH -->` in a page, replace the
  interior with the file at PATH (relative to repo root). Missing file →
  `Error("<page>: inline asset <PATH> does not exist")`. Idempotent. The
  README's generated-regions table gains a row.
- `check-links` needs no change (inline SVG has no external refs; `<img>`
  is not used).

## Testing

- `test/stamp-chrome.test.mjs`: inline region replaced; idempotent;
  missing asset error names page and path.
- `test/plumb-svg.test.mjs` (new; parses `assets/plumb.svg` with regexes,
  no DOM): required ids present; `#eye-r` rx ≥ 1.35 × `#eye-l` rx;
  `#head-shape` bounding extents asymmetric (max-x − cx > cx − min-x by ≥
  8 % of width, computed from the path's numeric points); `#mark-pl`
  exists; no `<image>`, `<script>`, or external `url(` in the SVG; file ≤
  6144 bytes.
- Browser (Playwright, before PR): flash fires on scrolling `#law` into
  view and only once; wave toggles; 0 console errors; both themes; hero
  screenshots (light + dark) attached to the PR for the owner to judge
  Plumb on a phone.
- `npm test`, `npm run check`, CI green.

## HQ brand-doc amendment (same sub-project, separate small commit in `hq`)

Append a dated section to `brand/plumb-character.md`: "2026-09-23 — site
palette follows the video (orange body, deeper flat green), owner decision;
sampled values listed; `slopstopper.org/assets/plumb.svg` is the vector
reference; idle is grounded — Plumb is not a pendulum, the bob on its head
is the plumb-bob." The yellow-body line stays, marked as superseded for the
site (ADR-style, nothing deleted).

## Out of scope

Feedback form migration and privacy notice (3), other tool pages (4), the
animation embed (5), home-page copy and footer (6), the retired-site
redirects (3). The swing/pendulum idea is parked, not rejected: revisit
after the page is seen live.

## Acceptance

- `/plumb-line/` renders the seven blocks; every body sentence appears in
  the PR's source table; version pill synced; writing list generated.
- Plumb: recognisably the owner's character; asymmetry and PL mark tests
  pass; flash fires once on the law block; wave works; reduced-motion path
  verified by toggling emulation in Playwright.
- No gutter plumb line on the page; no console errors; footer claim holds.
- Owner has approved the hero screenshots before merge (this is the
  "may change my mind" gate).
