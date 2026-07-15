# Document-Production Plan: Virtual Card Lifecycle Specification Package

> Internal planning artifact for this assignment — not one of the four graded deliverables listed in `TASKS.md`. Governs how `specification.md`, `agents.md`, `.claude/rules/fintech-specification.md`, and `README.md` get produced/finalized and how they'll be reviewed before submission.
>
> This is a **document-production plan**, not a software implementation plan: there is no tech stack, no build, no deploy. "Phases" below are writing/review passes over Markdown files, not code phases.

## 0. Constitution Check

Gate against `.specify/memory/constitution.md` v1.0.0 before finalizing any deliverable:

| Principle | Gate | Status |
|---|---|---|
| I. Requirement Traceability | Every FR traces to an MO; every MO has ≥1 FR and ≥1 task | ✅ satisfied — see §3 Traceability Matrix below |
| II. Regulated-Environment Defaults | Strict-by-default roles/permissions; deviations justified | ✅ satisfied — §3/§6/§8 of spec |
| III. Sensitive-Data Handling | PAN/CVV classification + handling rules restated in agent guidance | ⚠ pending — enforced when `agents.md`/rules file are written (§2 below) |
| IV. Auditability | Every state change has an audit event; auditors are audited | ✅ satisfied — FR-04/11/15/22, NFR-04 |
| V. Explicit Failure Modes | Edge-case table scoped to feature, with outcome + compliance implication | ✅ satisfied — §8, 20 rows (E-01–E-20) |
| VI. Measurable SLOs | Numeric targets, all labeled `[ASSUMPTION]` with rationale | ✅ satisfied — §5 |
| VII. Verifiable Acceptance Criteria | Every low-level task has checkable DoD; every MO has a verification method | ✅ satisfied — §9, §10 |

No unjustified violations. The one open gate (III) is closed by the production steps in §2, checked off in §5 Final Review.

## 1. Inputs Already Approved

- `specification.md` (root) — layered spec, 7 MOs, 26 FRs (FR-01–FR-25, incl. FR-12a; clarification additions FR-12a/24/25), 9 NFRs + performance table, 20 edge cases, verification strategy, 29 low-level tasks (T-001–T-029, incl. T-028/T-029 added during `/speckit-analyze` to close FR-24/FR-25 coverage gaps), Definition of Done (§11).
- `.specify/memory/constitution.md` v1.0.0 — 7 principles + governance.
- `TASKS.md` — authoritative assignment brief (grading rubric, deliverable list, cross-cutting requirements).
- `specification-TEMPLATE-example.md` — structural reference only, non-authoritative.

No further clarification or planning is needed on `specification.md`'s content; this plan governs producing the **other three** deliverables from it, plus a final consistency pass across all four.

## 2. Production Steps (per deliverable)

### 2a. `specification.md` — finalize, do not re-author

- Already complete from `/speckit-specify` + `/speckit-clarify`. This plan's only obligation here: run the Traceability Matrix (§3) and Final Review (§5) against it, and fix any gap surfaced (one gap — MO-02/MO-05 missing unit-test bullets — already fixed during this planning pass).

### 2b. `agents.md`

Source content by pulling directly from `specification.md` sections, not re-deciding anything:

| `agents.md` section | Sourced from `specification.md` |
|---|---|
| Hypothetical tech-stack assumptions | §6 Implementation Notes (money format, ID conventions) — stated as assumptions since no stack is mandated by TASKS.md |
| Domain rules (banking/FinTech) | §3 Stakeholders/Permissions, §4 Functional Requirements |
| Naming/style conventions | §6 (ID conventions, error-code taxonomy T-022), money/currency formatting rules |
| Testing & verification expectations | §9 Verification Strategy (unit/integration/e2e/fixtures/reconciliation/manual review) |
| Security & compliance constraints | §5 NFR-01–NFR-09, §6 Redaction/Retention/Authorization boundaries |
| Mandatory edge-case behavior | §8 Edge Cases table — condensed to imperative rules ("never retroactively cancel a hold on freeze", "never log PAN", "always emit audit event before state is read-visible") |

Acceptance criteria for this file: every rule traces to a spec section (cited inline), no rule contradicts the spec, no new numeric assumption introduced without `[ASSUMPTION]` labeling.

### 2c. `.claude/rules/fintech-specification.md`

Condensed, persistent, imperative rule file (this is what actually steers future Claude Code sessions in this repo) — a strict subset of `agents.md`, optimized for brevity over completeness:
- No production code/API/UI/schema in this repo (document-only).
- PAN/CVV redaction rule (never log/display beyond last-4, never persist CVV past creation hand-off).
- Idempotency + audit-before-read-visible rules restated as one-liners.
- Pointer back to `specification.md` and `agents.md` for full rationale — this file does not duplicate rationale, only the rule.

Acceptance criteria: file is short enough to be a persistent rule set (not a restatement of the whole spec), every rule is a MUST/NEVER imperative, no rule contradicts `agents.md`.

### 2d. `README.md`

Structure exactly per `TASKS.md`'s required table (Student & task summary / Rationale / Industry best practices), with the industry-best-practices section citing **exact `specification.md` section numbers** (e.g., "Idempotency — §6, FR-05/FR-12/FR-13" not just "idempotency is covered"). Rationale section must explain *why* the assumed performance targets (§5) and verification depth (§9) were chosen at the level already justified inline in the spec — README summarizes, does not re-derive.

## 3. Traceability Matrix (MO → FR → Verification → Low-Level Tasks)

| MO | Functional Requirements | Verification Activities (§9) | Low-Level Tasks (§10) |
|---|---|---|---|
| **MO-01** Card creation | FR-01, FR-02, FR-03, FR-04, FR-05 | Unit: eligibility/duplicate/idempotency/PAN-handling; Integration: stub-issuance-provider creation incl. transient/terminal failure; E2E: full lifecycle scenario | T-001, T-002, T-003, T-004, T-005, T-025 (fixtures), T-026 (e2e script) |
| **MO-02** Card viewing | FR-06, FR-07, FR-08 | Unit: field-set/masking/empty-state assertions (added this pass); Doc review | T-006, T-007 |
| **MO-03** Freeze/unfreeze | FR-09, FR-10, FR-11, FR-12, FR-12a, FR-25 (rate limit) | Unit: transition-pair coverage; Integration: freeze propagation to stub auth network; E2E: full lifecycle scenario | T-008, T-009, T-010, T-014 (concurrency), T-023 (atomicity), T-029 (rate limit) |
| **MO-04** Spending limit | FR-13, FR-14, FR-15, FR-16, FR-25 (rate limit) | Unit: limit-validation boundaries; Integration: concurrent freeze+limit race; Reconciliation: daily limit-vs-audit-trail replay | T-011, T-012, T-013, T-014, T-024, T-029 (rate limit) |
| **MO-05** Transaction viewing | FR-17, FR-18, FR-19, FR-24 | Unit: pagination/dedup/reversal-linking (added this pass); Integration: duplicate-delivery dedup; Reconciliation: feed-count-vs-paginated-count | T-015, T-016, T-017, T-028 (reversal linking) |
| **MO-06** Ops/compliance visibility | FR-20, FR-21, FR-22, FR-23 | Unit: no-PAN-path negative test; E2E: denied-access scenario; Manual: quarterly `ACCESS_DECISION` sampling | T-018, T-019, T-020, T-021, T-027 |
| **MO-07** Audit trail integrity | FR-04, FR-11, FR-15, FR-22 (audit emission); NFR-04 | Reconciliation: audit-trail replay check; write-then-audit atomicity (E-11) | T-005, T-010, T-013, T-020, T-023, T-024 |

No MO has an empty column. No FR is orphaned (every FR above appears in exactly one MO row, consistent with §4's per-requirement MO tag).

## 4. Sequencing

Pipeline, not a hard barrier — each deliverable only needs `specification.md` finalized first; `agents.md`, the rules file, and `README.md` can be drafted in any order after that, but `README.md`'s best-practices citations should be written last since it references section numbers that could shift if the other two files' production surfaces an inconsistency requiring a spec tweak.

1. Finalize `specification.md` (done — this plan's Traceability Matrix pass closed the one open gap).
2. Write `agents.md`.
3. Write `.claude/rules/fintech-specification.md`.
4. Write `README.md`, citing final section numbers from step 1.
5. Run Final Review (§5) across all four.

## 5. Final Review Checklist (against every `TASKS.md` deliverable & cross-cutting requirement)

- [ ] `specification.md` present at repo root, layered per `TASKS.md`'s table (high-level objective, mid-level objectives, non-functional & policy, implementation notes, beginning/ending context, low-level tasks) — all six present as §1–§2, §5, §6, §7, §10.
- [ ] Edge cases/failure modes: explicit table, scoped to the chosen feature, each with expected behavior + audit/compliance implication — §8, 20 rows.
- [ ] Verification: stated per mid-level objective; several low-level tasks end in checkable acceptance criteria — §9, §10 (all 27 tasks).
- [ ] Expected performance: measurable targets, labeled `[ASSUMPTION]` with rationale — §5.
- [ ] `agents.md` present, covers tech-stack assumptions, domain rules, code style, testing/verification expectations, security/compliance constraints, edge-case handling — §2b production step.
- [ ] Editor/AI rules file present at `.claude/rules/fintech-specification.md` — §2c production step.
- [ ] `README.md` present with all three required sections (student & task summary; rationale; industry best practices with file/section references) — §2d production step.
- [ ] No deliverable contains production code, API definitions, UI screens, or database schemas (Documentation-Only Scope, constitution).
- [ ] Every design assumption across all four deliverables is labeled `[ASSUMPTION]` (Assumption Labeling Discipline, constitution).
- [ ] Traceability Matrix (§3 above) has no empty cell and no orphaned FR.
