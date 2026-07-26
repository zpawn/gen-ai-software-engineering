# Documentation Tasks: Virtual Card Lifecycle Specification Package

> Internal planning artifact (not a graded deliverable — see `TASKS.md`). Decomposes `PLAN.md` §2's production steps into small, independently reviewable writing tasks. Story-label slot is repurposed for deliverable file, since this is a document-production task list, not a software feature breakdown: `[SPEC]`, `[AGENTS]`, `[RULES]`, `[README]`.

## Phase 1: Setup

- [x] T001 Confirm all planning inputs exist and are current: `specification.md`, `.specify/memory/constitution.md`, `PLAN.md`, `TASKS.md`.
  *Acceptance criteria*: [x] All four files readable at repo root / `.specify/memory/`; [x] no `[NEEDS CLARIFICATION]` markers remain in `specification.md` (confirmed during `/speckit-clarify`).

## Phase 2: Foundational (blocks all deliverable phases below)

- [x] T002 Freeze `specification.md` section numbering before any cross-referencing deliverable is drafted, in `specification.md`.
  *Acceptance criteria*: [x] Sections 1–11 plus `## Clarifications` are stable (no further renumbering planned); [x] `PLAN.md` §3 Traceability Matrix reflects the frozen numbering with no empty cells.

- [x] T003 Extract a single "citation key" list (section number → one-line topic) from `specification.md` for reuse across `agents.md`, the rules file, and `README.md`, kept only in working memory/this task's output (not a separate file).
  *Acceptance criteria*: [ ] List covers at minimum §3 (permissions), §4 (FRs), §5 (NFRs/performance), §6 (implementation notes), §8 (edge cases), §9 (verification), §11 (DoD); [ ] every downstream deliverable task below cites from this list rather than re-deriving section numbers independently.

## Phase 3: `specification.md` finalization [SPEC]

*Goal*: confirm the already-drafted spec is submission-ready; this phase is review-only, not authoring (drafting happened under `/speckit-specify` + `/speckit-clarify`).
*Independent test*: a reviewer with only `TASKS.md` and `specification.md` open can check every rubric row without opening any other file.

- [x] T004 [SPEC] Re-verify every MO-01…MO-07 has ≥1 FR and ≥1 low-level task, in `specification.md` §2/§4/§10.
  *Acceptance criteria*: [x] Matches `PLAN.md` §3 Traceability Matrix with zero empty cells (verified during `/speckit-plan`).

- [x] T005 [SPEC] Re-verify every numeric NFR/performance target carries an `[ASSUMPTION]` label and one-line rationale, in `specification.md` §5.
  *Acceptance criteria*: [x] All 9 rows in the Performance table plus NFR-05/07/09 are labeled (confirmed during `/speckit-clarify`).

- [x] T006 [P] [SPEC] Re-verify the edge-case table (§8) covers empty states, partial failures, concurrency, invalid limits, stale data, permission boundaries, and fraud-adjacent patterns, per `TASKS.md`'s cross-cutting requirement #1.
  *Acceptance criteria*: [x] At least one row exists per named category (E-17 empty; E-11 partial failure; E-07 concurrency; E-05 invalid limits; E-08 stale/propagation; E-13 permission boundary; E-14/E-20 fraud-adjacent).

## Phase 4: `agents.md` [AGENTS]

*Goal*: produce AI-agent guidance sourced from `specification.md`, per `PLAN.md` §2b.
*Independent test*: every rule in `agents.md` can be traced to a specific `specification.md` section by a reviewer, with no new (uncited) assumption introduced.

- [x] T007 [AGENTS] Write "Hypothetical tech-stack assumptions" section in `agents.md`, citing `specification.md` §6 (money format, ID conventions) and noting no stack is mandated by `TASKS.md`.
  *Acceptance criteria*: [ ] Explicitly states "no language/framework/database is prescribed"; [ ] money-format and ID-convention rules are restated, each with a `specification.md` §6 citation.

- [x] T008 [P] [AGENTS] Write "Domain rules (banking/FinTech)" section in `agents.md`, citing §3 (Stakeholders/Permissions) and §4 (Functional Requirements).
  *Acceptance criteria*: [ ] Role boundaries (end-user vs. ops/compliance) restated with citation; [ ] single-card-per-account rule (FR-01/FR-02) restated.

- [x] T009 [P] [AGENTS] Write "Naming/style conventions" section in `agents.md`, citing §6 (ID conventions, error-code taxonomy T-022) and §5 (money/currency formatting).
  *Acceptance criteria*: [ ] Error-code taxonomy list is reproduced verbatim from T-022's set; [ ] money format rule (minor units + ISO 4217) restated with citation.

- [x] T010 [AGENTS] Write "Testing & verification expectations" section in `agents.md`, citing §9 Verification Strategy in full (unit/integration/e2e/fixtures/reconciliation/manual review).
  *Acceptance criteria*: [ ] All six verification categories from §9 are represented; [ ] each links back to the `specification.md` §9 subsection it summarizes.

- [x] T011 [AGENTS] Write "Security & compliance constraints" section in `agents.md`, citing §5 NFR-01–NFR-09 and §6 Redaction/Retention/Authorization boundaries.
  *Acceptance criteria*: [ ] PAN/CVV never-log/never-display-beyond-last-4 rule stated explicitly; [ ] retention assumption (7 years, NFR-05) restated; [ ] rate-limit rule (NFR-09) restated.

- [x] T012 [AGENTS] Write "Mandatory edge-case behavior" section in `agents.md`, condensing §8's 20-row table into imperative MUST/NEVER rules.
  *Acceptance criteria*: [ ] At least one imperative rule per edge-case cluster (creation, freeze/unfreeze, limit, transactions, ops access, concurrency); [ ] no rule contradicts a §8 row.

- [x] T013 [AGENTS] Final self-consistency pass over `agents.md`: confirm no rule introduces a new unlabeled numeric assumption and every rule cites a `specification.md` section.
  *Acceptance criteria*: [ ] Zero uncited rules; [ ] zero new unlabeled numbers; [ ] file reads as guidance, not a duplicate of the spec.

## Phase 5: `.claude/rules/fintech-specification.md` [RULES]

*Goal*: concise, persistent, imperative rule file for Claude Code sessions in this repo, per `PLAN.md` §2c.
*Independent test*: the file is short enough to read in under a minute and every line is a MUST/NEVER imperative, not rationale.

- [x] T014 [RULES] Write the document-only scope rule (no production code/API/UI/schema in this repo) in `.claude/rules/fintech-specification.md`, citing the constitution's Documentation-Only Scope section.
  *Acceptance criteria*: [ ] One-line MUST/NEVER statement; [ ] cites constitution section by name, not by re-explaining it.

- [x] T015 [P] [RULES] Write the PAN/CVV redaction rule (never log/display beyond last-4, never persist CVV past creation hand-off) in `.claude/rules/fintech-specification.md`.
  *Acceptance criteria*: [ ] Rule is a single imperative sentence; [ ] matches `specification.md` §6 Redaction without adding new detail.

- [x] T016 [P] [RULES] Write the idempotency + audit-before-read-visible one-liners in `.claude/rules/fintech-specification.md`, citing §6 Idempotency and §5 NFR-08/E-11.
  *Acceptance criteria*: [ ] Two separate one-line rules (idempotency; write-then-audit atomicity); [ ] no rationale prose, imperative only.

- [x] T017 [RULES] Add a pointer block at the end of `.claude/rules/fintech-specification.md` linking back to `specification.md` and `agents.md` for full rationale.
  *Acceptance criteria*: [ ] Pointer states this file does not duplicate rationale; [ ] both file paths named explicitly.

## Phase 6: `README.md` [README]

*Goal*: student/task summary, rationale, and industry-best-practices sections with exact `specification.md` references, per `PLAN.md` §2d and `TASKS.md`'s required table.
*Independent test*: a reader can jump from any README best-practice bullet directly to the cited `specification.md` section and find it addressed there.

- [x] T018 [README] Write "Student & task summary" section in `README.md`.
  *Acceptance criteria*: [ ] Names the student and gives a brief homework summary per `TASKS.md`'s required table row.

- [x] T019 [README] Write "Rationale" section in `README.md`, explaining why the spec was structured as it is and how performance targets (§5) and verification depth (§9) were chosen.
  *Acceptance criteria*: [ ] Explicitly references the `[ASSUMPTION]` labeling convention; [ ] explains the single-card-per-account scope decision; [ ] does not re-derive numbers already justified in §5, only summarizes the reasoning.

- [x] T020 [README] Write "Industry best practices" section in `README.md`, listing each adopted practice with an exact `specification.md` file/section reference.
  *Acceptance criteria*: [ ] At least one bullet per constitution principle (I–VII) naming the spec section that satisfies it; [ ] every bullet includes a section number, not just a vague description.

- [x] T021 [README] Final consistency pass: confirm every section-number citation in `README.md` matches the frozen numbering from T002/T003.
  *Acceptance criteria*: [ ] Zero stale/incorrect section references; [ ] README table structure matches `TASKS.md`'s three required rows exactly.

## Phase 7: Polish & Cross-Cutting Final Review

*Goal*: one pass across all four deliverables against every `TASKS.md` requirement, per `PLAN.md` §5.

- [x] T022 Run `PLAN.md` §5 Final Review checklist against all four finished deliverables.
  *Acceptance criteria*: [ ] Every checkbox in `PLAN.md` §5 is checked; [ ] any failure is fixed and the checklist re-run before submission.

- [x] T023 [P] Confirm no deliverable contains production code, API definitions, UI screens, or database schemas.
  *Acceptance criteria*: [ ] Manual scan of all four files finds zero code blocks representing real implementation (prose/tables only).

- [x] T024 [P] Confirm `[ASSUMPTION]` labeling convention is used identically across all four deliverables.
  *Acceptance criteria*: [ ] Same marker string used in `specification.md`, `agents.md`, and (where applicable) `README.md`; [ ] no deliverable invents an unlabeled number.

## Dependencies & Execution Order

- Phase 1 → Phase 2: sequential (setup must confirm inputs before numbering is frozen).
- Phase 2 → Phases 3–6: Phase 3 (spec review) must complete before Phases 4–6 begin, since they cite frozen section numbers from Phase 3/T002.
- Phases 4 and 5 are mutually independent (`agents.md` and the rules file share no file) and MAY run in parallel once Phase 3 is done.
- Phase 6 (`README.md`) depends on Phases 3–5 being substantively stable, since it cites all of them, but MAY be drafted in parallel and reconciled last (T021).
- Phase 7 depends on all of Phases 3–6.

## Parallel Execution Examples

- After Phase 3 completes: T007, T008, T009 (agents.md subsections) and T015, T016 (rules file lines) can all run in parallel — different files, no shared state.
- T023 and T024 (Phase 7) can run in parallel — independent scans.

## Suggested Minimum Scope

If time-constrained, the non-negotiable minimum to satisfy `TASKS.md`'s deliverable list is: Phase 3 (spec already done) + one pass each of Phases 4, 5, 6 (T007–T009 condensed into fewer subsections if needed) + Phase 7 T022. Do not skip Phase 7 — it is the only step that checks the four deliverables against each other and against `TASKS.md` as a set, not in isolation.
