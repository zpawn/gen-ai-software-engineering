# Project Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished five-minute Ukrainian Reveal.js presentation as one offline `presentation.html` file in the project root.

**Architecture:** A temporary build step reads the official Reveal.js distribution and selected repository screenshots, then writes one HTML artifact with all CSS, JavaScript, SVG, and PNG data embedded. The presentation itself has no runtime dependency beyond a browser and opens directly from the filesystem.

**Tech Stack:** HTML5, CSS, JavaScript, Reveal.js, inline SVG, base64 PNG, Node.js verification, Google Chrome headless screenshots.

## Global Constraints

- Create exactly one presentation artifact at root: `presentation.html`.
- The deck must work offline and must not load any external URL.
- Use Ukrainian presentation copy and keep technical identifiers in English.
- Fit the talk into five minutes with eight horizontal slides.
- Preserve all existing user changes and archives.
- Do not stage or commit files.

---

### Task 1: Collect verified presentation evidence

**Files:**
- Modify: `docs/research-notes.md`
- Modify: `docs/log.md`

**Interfaces:**
- Consumes: repository tests, `demo.sh`, Context7 Reveal.js documentation.
- Produces: exact metrics and framework patterns used by the deck.

- [ ] **Step 1: Run the automatic demo**

Run: `PORT=3210 ./demo.sh`

Expected: canonical summary `8/3/3/2`, non-logical summary `8/0/0/8`, and a safe transaction result with `PIPELINE_DEPENDENCY_MISSING`.

- [ ] **Step 2: Run project verification**

Run: `npm test`, `npm run typecheck`, and `npm run test:coverage`.

Expected: all tests pass and the reported totals are copied exactly into the presentation.

- [ ] **Step 3: Record Reveal.js research**

Append the exact Context7 query, `/hakimel/reveal.js`, initialization and speaker-notes insight, and the actual offline bundling use to `docs/research-notes.md`.

### Task 2: Build the self-contained Reveal.js deck

**Files:**
- Create: `presentation.html`

**Interfaces:**
- Consumes: Reveal.js `dist/reveal.js`, `dist/reveal.css`, repository screenshots, and Task 1 metrics.
- Produces: one directly openable offline HTML presentation.

- [ ] **Step 1: Obtain the official Reveal.js browser distribution**

Use the published `reveal.js` package in a temporary directory. Preserve the upstream license header and do not add it to project dependencies.

- [ ] **Step 2: Assemble the one-file document**

Embed Reveal.js CSS and JavaScript, custom Fintech Command Center CSS, inline SVG diagrams, selected screenshots as data URLs, eight slide sections, and Ukrainian `<aside class="notes">` blocks.

- [ ] **Step 3: Initialize the deck**

Call `Reveal.initialize` with `controls: true`, `progress: true`, `hash: true`, `slideNumber: "c/t"`, `center: false`, and a short slide transition. Add a visible keyboard hint and a fallback for disabled JavaScript.

### Task 3: Verify and visually refine

**Files:**
- Modify: `presentation.html`
- Create: `docs/screenshots/presentation-title.png`
- Create: `docs/screenshots/presentation-architecture.png`
- Modify: `docs/log.md`

**Interfaces:**
- Consumes: Task 2 HTML.
- Produces: verified browser output and review evidence.

- [ ] **Step 1: Run static artifact checks**

Use a Node.js script to assert one HTML document, eight top-level slides, eight notes blocks, embedded Reveal.js, no external resource references, and required evidence strings.

- [ ] **Step 2: Render key slides in Chrome**

Open `presentation.html` in Google Chrome and capture the title and architecture slides at 1280 × 720. Inspect both images for clipping, contrast, and readable text.

- [ ] **Step 3: Refine and repeat checks**

Fix any visual issue in `presentation.html`, then repeat the static check and screenshots until both slides are clean.

- [ ] **Step 4: Record completion evidence**

Append actual files and commands to `docs/log.md`, run `git diff --check`, and report a suggested Conventional Commit title without staging or committing.
