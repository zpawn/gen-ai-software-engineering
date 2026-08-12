# Project Presentation Design

## Goal

Create a five-minute Ukrainian classroom presentation that explains the configurable transaction pipeline and its REST API. The presentation must be one self-contained `presentation.html` file in the project root and must work without internet access.

## Approved Direction

The presentation uses the recommended **Fintech Command Center** direction shown in the visual companion. It has a dark navy background, cyan and violet accents, strong numeric evidence, compact diagrams, and terminal-style proof panels. This direction makes the pipeline order, REST boundary, and test evidence easy to see on a classroom projector.

The alternative light academic and banking editorial directions are intentionally not used. The dark direction gives the strongest contrast and better matches the runtime and API subject.

## Audience and Timing

- Audience: teacher and students reviewing the capstone project.
- Language: Ukrainian, with English API names and code identifiers unchanged.
- Duration: five minutes.
- Length: eight horizontal slides, about 30–40 seconds per slide.
- Speaker support: each slide includes short Ukrainian speaker notes.

## Story

1. Introduce the result: a file-based transaction pipeline is now configurable and available through REST.
2. Show the three changed customer requirements.
3. Explain the one-server architecture and the internal file protocol.
4. Show that the integrator receives `options.steps` and the configurator accepts any exact permutation.
5. Demonstrate a non-logical order and its deterministic skipped-stage trace.
6. Show the REST contract and automatic `demo.sh` flow.
7. Present fresh quality evidence: 121 tests, coverage, security controls, and independent review.
8. Close with three takeaways and the exact backup command.

## Technical Architecture

The root `presentation.html` contains:

- the minified Reveal.js runtime and core CSS;
- all custom theme CSS;
- all slide markup and inline SVG diagrams;
- embedded PNG screenshots as `data:image/png;base64` values;
- Reveal.js initialization with controls, progress, hash navigation, slide numbers, and keyboard navigation;
- `<aside class="notes">` speaker notes;
- a small offline fallback message if JavaScript is disabled.

No CDN, web font, external image, local image path, or separate JavaScript file is required at presentation time. The file opens directly with `file://` in a modern browser.

## Visual System

- Canvas: 16:9, 1280 × 720 logical pixels.
- Colors: deep navy background, cyan for valid flow, violet for configuration, amber for warnings, and coral for rejected results.
- Typography: system sans-serif stack so no font download is needed.
- Content density: one main message per slide, no paragraph longer than three lines.
- Motion: short fade/slide transitions and limited fragments; information must remain understandable without animation.
- Accessibility: high contrast, minimum projected body size, text alternatives for screenshots, and no color-only status encoding.

## Evidence and Accuracy

The deck uses facts from the repository and fresh commands:

- TypeScript pipeline agents: `transaction-validator`, `fraud-detector`, `compliance-checker`;
- configuration agent: `pipeline-configurator`;
- canonical result: 8 total, 3 approved, 3 review, 2 rejected;
- non-logical example: fraud detector first, with skipped dependency trace and 8 rejected results;
- current test and coverage totals only after a fresh verification run;
- security: Decimal.js money handling, fixed result schemas, PII-safe output, and one-run API lock.

## Failure Handling

- If Reveal.js initialization fails, the HTML remains readable as stacked sections.
- If a screenshot cannot be embedded, the slide keeps the verified text metrics and does not show a broken image.
- The live REST demo is not required during the talk. `./demo.sh` is the backup and performs the complete flow automatically.

## Verification

The final artifact must pass these checks:

1. It contains no external `src`, `href`, CSS `url(http...)`, or file asset references.
2. It contains exactly eight top-level slides and Ukrainian speaker notes.
3. Reveal.js initializes without console errors.
4. Keyboard navigation, progress, slide numbers, overview, and fullscreen work.
5. The title and architecture slides render at 1280 × 720 without clipping.
6. A fresh `./demo.sh`, test suite, typecheck, and coverage run support the numbers used in the deck.

## Scope

This work creates the presentation and supporting verification screenshots only. It does not change runtime behavior, API contracts, pipeline data, or user archives.
