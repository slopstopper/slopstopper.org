# slopstopper.org — feedback form, privacy notice, retiring the old site (sub-project 3 of 6)

Date: 2026-09-23. Status: approved in conversation.

## Intent

Bring plumb-line's private feedback form onto the org site in-brand, publish a
UK GDPR privacy notice that covers it and the hosting, and retire
`slopstopper.github.io/plumb-line` with redirects and link updates in the
plumb-line repository.

## Decisions

| Decision | Choice | Rejected |
| --- | --- | --- |
| Form backend | Keep the existing Formspree endpoint (`/f/mwvdqwpe`) | Email-only; Cloudflare Worker → private repo issues |
| Controller identity | "run by an individual based in the UK"; name available on request; contact `slopstopperskills@gmail.com`. No commentary on business status | Publishing the owner's name; GitHub-issue-only contact |
| Retention (owner decision 2026-09-23) | Kept with email for up to 24 months; then identifying details deleted from Formspree and the mailbox, technical content kept anonymised | 12 months; indefinite |
| Redirects | Meta-refresh stubs at the old URLs; Pages stays on for 3 months (issue filed) | Deleting `docs/` at once (breaks inbound links) |
| Prose rule | The notice is legal text: Claude drafts, owner approves/edits before merge | — |

## Pages

- `plumb-line/feedback/index.html` (`data-page="plumb-line"`, depth 2): same
  fields as `docs/feedback.html` in plumb-line; site form styling; hidden
  honeypot `_gotcha`; `_subject` kept; `_next` = `https://slopstopper.org/plumb-line/feedback/?sent=1`;
  a one-line data notice above the button linking to `/privacy/`; a
  "sent" panel shown by `site.js` when `?sent=1` is present. Nothing loads
  from Formspree on view.
- `privacy/index.html`: the notice (sections below), `noindex` removed,
  "Last updated" date.
- `plumb-line/index.html`: §05 "Private feedback" → `feedback/`, `data-todo` removed.

## Privacy notice — sections (plain English, dated)

1. Who runs this site: an individual based in the UK; contact
   `slopstopperskills@gmail.com`; name available on request.
2. Visiting the site: no cookies, no analytics, no tracking; one theme
   preference stored in the visitor's own browser (`localStorage`), never sent
   anywhere.
3. Hosting logs: GitHub Pages and Cloudflare may log IP addresses and request
   data to serve and protect the site; links to both privacy statements; we
   do not receive or keep those logs.
4. The feedback form: fields listed; email optional; purpose = improving
   plumb-line; lawful basis = legitimate interests (feedback) and consent
   (the quote tick-box); Formspree processes submissions in the United
   States (link to Formspree's privacy policy); transfers rely on the
   provider's published safeguards.
5. Retention: as decided above.
6. Your rights under UK GDPR (access, rectification, erasure, restriction,
   objection, portability where it applies; withdraw consent to quoting at
   any time) and how: email the contact address.
7. Complaints: the Information Commissioner's Office (ico.org.uk).
8. Changes: notice is versioned in the site repository; the date updates.

## Retirement (plumb-line repo)

- `docs/index.html` → stub: `<meta http-equiv="refresh" content="0; url=https://slopstopper.org/plumb-line/">`, canonical, plain link.
- `docs/feedback.html` → stub to `https://slopstopper.org/plumb-line/feedback/`.
- `README.md` §Feedback, `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/feedback.yml`: new form URL.
- `docs/content/TEMPLATE.md`: #405 fixes (cap language → current gate; repo
  name → `slopstopper/slopstopper.org`; the site row is now generated).
- Issue: "Disable GitHub Pages for plumb-line after 2026-12-23" with the
  reason and checklist.

## Tests / acceptance

- `test/privacy.test.mjs`: the notice contains the contact address, "GitHub
  Pages", "Cloudflare", "Formspree", a retention statement, "Information
  Commissioner", a "Last updated" date; `noindex` absent.
- `test/feedback.test.mjs`: form action is the Formspree endpoint; `_gotcha`
  honeypot present; `_next` points at the site; a link to `../../privacy/`;
  the page loads no external `<script>`/`<link>`.
- `npm run check` green (link checker covers depth-2 paths); CI green.
- Browser: `?sent=1` shows the sent panel; form renders in both themes.
- Owner approves the notice text before merge.
