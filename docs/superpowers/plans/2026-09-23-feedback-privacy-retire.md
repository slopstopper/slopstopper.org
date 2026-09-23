# Feedback, Privacy, Retirement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship `/plumb-line/feedback/`, the `/privacy/` notice, and retire the old GitHub Pages site.
**Spec:** `docs/superpowers/specs/2026-09-23-feedback-privacy-retire-design.md`
**Tech:** static HTML, `site.css` form styles, ~15 lines in `site.js`, `node:test`.

## Global constraints
Inherit sub-projects 1–2. Nothing loads from a third party on page view. Notice text is owner-approved before merge. Contact `slopstopperskills@gmail.com`; controller "an individual based in the UK"; no business-status commentary.

## Review focus
1. Form submitted with the honeypot filled (a bot): Formspree silently drops it; the page must not promise a reply. 2. Visitor lands on `?sent=1` directly: the sent panel shows, the form still works. 3. Privacy page at depth 1 and feedback at depth 2: all relative asset paths resolve (link checker). 4. Old-site stub with JavaScript and meta refresh blocked: the plain link is visible. 5. Someone submits without an email: nothing breaks; notice says email is optional.

### Task 1: register page, failing tests (privacy.test.mjs, feedback.test.mjs) — RED
### Task 2: form styles in site.css; feedback page; sent-panel JS; privacy notice; §05 link — GREEN; stamp; npm run check
### Task 3: browser check (sent panel, both themes, depth-2 paths); screenshots to owner; draft PR
### Task 4 (plumb-line repo, worktree): redirect stubs; README/config.yml/feedback.yml links; TEMPLATE.md #405 fixes; Pages-disable issue; PR closing #405
