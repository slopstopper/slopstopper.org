# slopstopper.org

The org site. Plain committed HTML on GitHub Pages behind Cloudflare, served
from `main`. Self-hosted fonts, no trackers, no runtime external calls, and
`scripts/check-links.mjs` fails CI if that stops being true.

## Pages

| URL | File |
| --- | --- |
| `/` | `index.html` |
| `/plumb-line/` | `plumb-line/index.html` |
| `/privacy/` | `privacy/index.html` |

Add a page by creating the file and listing it in `scripts/pages.mjs`.

## Generated regions — do not hand-edit

| Region | Marker | Generator | Source |
| --- | --- | --- | --- |
| Header, footer | `<!-- chrome:header -->`, `<!-- chrome:footer -->` | `scripts/stamp-chrome.mjs` | `templates/*.html` |
| Version pills | `<span data-sync="version:TOOL">` | `scripts/sync-versions.mjs` | latest GitHub Release per repo in `data/versions.json` |
| Writing list | `<!-- writing:list -->` | `scripts/sync-writing.mjs` | `slopstopper/plumb-line` `docs/content/YYYY-MM-DD-*.md` |
| Inlined asset | `<!-- inline:PATH -->` | `scripts/stamp-chrome.mjs` | the file at PATH (e.g. `assets/plumb.svg`) |
| Asset fingerprints | `site.css?v=…`, `site.js?v=…` | `scripts/stamp-chrome.mjs` | content hash of the file, so browser caches (Cloudflare: 4h) never pair old assets with new HTML |

Edit the template or the source, then `npm run sync` (online: asks GitHub
for releases and pieces). `npm run check` is what CI runs: it sets
`SYNC_OFFLINE=1` and compares the pages against the committed `data/`, so a
PR fails only for a hand-edited generated region, never for an upstream
release that landed while it was open. `npm test` runs the unit tests. `.github/workflows/sync-site.yml`
regenerates and commits daily, on manual dispatch, and when plumb-line's
release workflow sends a `tool-released` dispatch.

## Design notes

`docs/superpowers/specs/` holds the approved designs; `docs/superpowers/plans/`
the implementation plans.
