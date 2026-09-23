# slopstopper.org — site foundation (sub-project 1 of 5)

Date: 2026-09-23. Status: approved in conversation; awaiting spec review.

## Intent

The owner is retiring `slopstopper.github.io/plumb-line` (stale, off-brand)
and growing slopstopper.org from one page into the home for every
slopstopper project. The owner rarely touches the site by hand, so it must
keep itself current as the tools release. This sub-project builds the
structure the later ones stand on; it ships no final content.

The five sub-projects, in order:

1. **Foundation** (this spec): multi-page layout, shared chrome, automation,
   stub pages at the real URLs.
2. plumb-line page: content, writing list, Plumb the character.
3. Feedback form, UK GDPR privacy notice, redirects from the old site,
   repo link updates (README, issue templates, plumb-line #405).
4. tokenomics and recursive-spine pages from the proven template.
5. (deferred) Embedding the real Plumb animations (TikTok/Instagram now,
   YouTube later), weighed against the site's no-external-calls claim.

## Constraints

- No build step at runtime and no runtime external calls; the footer says
  so and must stay true. Generated HTML is committed, as versions are today.
- Static hosting on GitHub Pages behind Cloudflare, serving from `main`.
- No new dependencies. Node 20, `node:test`, and the GitHub REST API only.
- Published prose is owner-written (hq standard, 2026-09-05). Stubs carry a
  heading and one placeholder sentence, marked as placeholders.

## Decisions taken in brainstorming

| Decision | Choice | Rejected |
| --- | --- | --- |
| Shared chrome | Stamp script writing templates into committed pages between markers, run by the existing sync workflow | Hand-duplicated chrome with a drift check; a static site generator |
| Writing list | Auto-synced from `slopstopper/plumb-line` `docs/content`; the plumb-line merge is the publish approval | A site-side PR per piece (the step that went stale, see site PR #5) |
| URLs | `/plumb-line/`, `/privacy/`, later `/plumb-line/feedback/` | `/tools/<name>/` |
| Release latency | plumb-line release workflow fires `repository_dispatch` `tool-released` | Cron only |

## Layout

```
index.html                  home; §07 writing section removed (moves to plumb-line page)
plumb-line/index.html       stub; carries writing:list markers
privacy/index.html          stub
site.css                    all shared styles, extracted from index.html
site.js                     theme toggle, copy buttons, reveal, plumb swing
templates/header.html       logo, nav, theme toggle
templates/footer.html       footer columns, colophon
data/versions.json          unchanged shape
data/writing.json           generated: [{date, title, url, slug}]
scripts/sync-versions.mjs   rewrites pills on every page listed in scripts/pages.mjs
scripts/sync-writing.mjs    new
scripts/stamp-chrome.mjs    new
scripts/check-links.mjs     new
scripts/pages.mjs           the list of page paths every script iterates
test/*.test.mjs             node:test suites
```

Page-specific styles (hero masthead, swinging plumb line) live in `site.css`
too; per-page stylesheets are not worth it at five pages.

## Shared chrome

Every page contains:

```html
<!-- chrome:header --> ... <!-- /chrome:header -->
<!-- chrome:footer --> ... <!-- /chrome:footer -->
```

`stamp-chrome.mjs` replaces the content between each pair with the matching
template. Templates use root-relative-by-depth paths: the script computes
the page's depth and rewrites a `{{root}}` token to `./`, `../`, etc., so
`site.css` and asset paths resolve from any directory. Current-page nav
highlighting uses `<body data-page="home|plumb-line|privacy|...">` and a CSS
rule; the template is byte-identical across pages and the script holds no
per-page logic.

Nav: home sections as today, plus a tools row: plumb-line (`/plumb-line/`),
tokenomics and recursive-spine (their GitHub repos until sub-project 4).

Flags: `--check` exits 1 if any page would change, writes nothing.

## Automation

One workflow (`sync-versions.yml`, renamed `sync-site.yml`) runs, in order:
`sync-versions`, `sync-writing`, `stamp-chrome`, then commits `data/` and
the pages if anything changed. Triggers unchanged: daily cron, manual
dispatch, `repository_dispatch` type `tool-released`.

### sync-versions.mjs

Gains a page list (`scripts/pages.mjs`) and rewrites `data-sync="version:*"`
spans on every page. Behaviour otherwise unchanged.

### sync-writing.mjs

1. `GET /repos/slopstopper/plumb-line/contents/docs/content`.
2. Keep files matching `^\d{4}-\d{2}-\d{2}-.+\.md$`; skip everything else
   (TEMPLATE.md, WATCHER.md and any future uppercase file).
3. For each kept file, fetch it and take the first `# ` heading as the
   title; the date comes from the filename; the URL is the GitHub blob URL
   on `main`.
4. Write `data/writing.json` sorted newest first.
5. Render `<li>` rows between `<!-- writing:list -->` / `<!-- /writing:list -->`
   on every page that carries the markers (the plumb-line page; the home page
   loses its list).

Without network: regenerate from the committed JSON and warn. Never invent a
row; a file with no heading is skipped with a warning naming the file.

### Release ping (plumb-line repo)

A final step in `release.yml`, after publish succeeds:

```yaml
- name: Ping slopstopper.org
  if: success()
  env: { GH_TOKEN: ${{ secrets.SITE_DISPATCH_TOKEN }} }
  run: gh api repos/slopstopper/slopstopper.org/dispatches -f event_type=tool-released
```

`SITE_DISPATCH_TOKEN` is a fine-grained PAT with contents: write on
slopstopper.org only, added by the owner. Without it the step fails
non-fatally (`continue-on-error: true`) and the daily cron catches up: the
ping is speed, not correctness. This lands as a separate small PR in
plumb-line.

## Testing and CI

- `test/stamp-chrome.test.mjs`: idempotent on a stamped page; rewrites
  `{{root}}` by depth; `--check` exits 1 on drift.
- `test/sync-writing.test.mjs`: filename filter; title from first heading;
  skip-with-warning on no heading; newest-first order; row rendering against
  a fixture page. API calls are stubbed via an injected fetch.
- `test/sync-versions.test.mjs`: multi-page rewrite against fixtures.
- `test/check-links.test.mjs`: relative hrefs and `#anchors` resolve within
  the built pages; external links are not fetched.
- `ci.yml` (new) on every PR: `node --test`, then each script with
  `--check` and no token, then `check-links`. A PR that hand-edits a
  generated region fails with the diff.

## Out of scope

Final content for the plumb-line and privacy pages, the feedback form,
redirects and link updates in plumb-line, the animation embed, and the
tokenomics/recursive-spine pages. Site PR #5 is superseded by the writing
sync and will be closed with a comment when this lands.

## Acceptance

- `slopstopper.org/`, `/plumb-line/`, `/privacy/` load with identical chrome,
  correct nav highlight, and working theme toggle at each depth.
- Home no longer shows §07 writing; `/plumb-line/` lists the four existing
  pieces, generated, newest first.
- All scripts pass `--check` on a clean tree; `node --test` green; CI green.
- Footer claim (self-hosted, no trackers, no runtime external calls) remains
  true: verified by grepping the built pages for `<script src`, `<iframe`,
  `<link rel="stylesheet" href="http`.
