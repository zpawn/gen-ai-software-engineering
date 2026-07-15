# Submission Checklist: Virtual Card Lifecycle Specification Package

**Purpose**: Unit-test the *requirements themselves* — completeness, clarity, consistency, measurability, and coverage — across `specification.md`, `agents.md`, `.claude/rules/fintech-specification.md`, and `README.md`, against every rubric point in `TASKS.md`. This checklist validates whether the writing is submission-ready; it does not test any implementation (there is none).
**Created**: 2026-07-15
**Feature**: `specification.md` (root), cross-referenced against `TASKS.md` and `.specify/memory/constitution.md`

## Required Files & Deliverable Completeness

- [ ] CHK001 Does a requirement or statement exist confirming all four required files (`specification.md`, `agents.md`, an editor/AI rules file, `README.md`) are present at the locations `TASKS.md` expects? [Completeness, Gap]
- [ ] CHK002 Is it documented which file satisfies the "Editor/AI rules" deliverable, given `TASKS.md` allows several possible locations (`.github/copilot-instructions.md`, `.claude/` file, `.cursor/rules/*.md`)? [Clarity, Gap]
- [ ] CHK003 Does `specification.md` state, rather than leave implicit, that `specification-TEMPLATE-example.md` is structural reference only and non-authoritative? [Clarity, Spec §1]

## Layered Specification Structure (per TASKS.md table)

- [ ] CHK004 Is the high-level objective expressed as a single, unambiguous sentence with an explicit scope boundary? [Clarity, Spec §1]
- [ ] CHK005 Are there at least five mid-level objectives, and is each one phrased as an observable outcome rather than an internal implementation step? [Completeness/Measurability, Spec §2]
- [ ] CHK006 Are non-functional and policy requirements (security, privacy, audit/logging, reliability, performance) each stated as a discrete, separately-checkable item rather than bundled into one paragraph? [Clarity, Spec §5]
- [ ] CHK007 Are implementation-note guardrails (money format, IDs, idempotency, concurrency, error semantics, redaction, retention, authorization) each present as its own labeled bullet, with none of the eight topics missing? [Completeness, Spec §6]
- [ ] CHK008 Is the "beginning context" distinguished clearly from "ending context" such that a reader could not confuse pre-work state with post-work state? [Clarity, Spec §7]
- [ ] CHK009 Does the low-level task list contain enough tasks to demonstrate real decomposition (i.e., more than a handful of generic bullets), with each task tied to a named mid-level objective? [Completeness, Spec §10]

## Traceability (Goals → Requirements → Verification → Tasks)

- [ ] CHK010 Does every mid-level objective (MO-01…MO-07) have at least one functional requirement citing it, with no objective left as an orphan? [Traceability, Spec §2/§4]
- [ ] CHK011 Does every functional requirement cite the mid-level objective(s) it serves, rather than standing unlinked? [Traceability, Spec §4]
- [ ] CHK012 Does every low-level task state which objective(s) it links to and, where relevant, its dependency on other tasks? [Traceability, Spec §10]
- [ ] CHK013 Is there a single consolidated matrix or statement mapping each objective to its requirements, verification activities, and tasks together, rather than requiring a reader to cross-reference three separate sections manually? [Completeness, Plan §3]
- [ ] CHK014 Are the requirement, task, and audit-event ID schemes (FR-##, T-###, NFR-##, E-##) each unique and non-overlapping, so a citation is unambiguous? [Consistency, Spec §4/§5/§8/§10]

## Edge Case & Failure-Mode Requirement Quality

- [ ] CHK015 Are requirements present for empty/zero states (e.g., no card yet, no transactions yet), not just for the populated happy path? [Coverage, Spec §8 E-17]
- [ ] CHK016 Are requirements present for partial-failure scenarios (e.g., a write that persists state but not its audit event)? [Coverage, Spec §8 E-11]
- [ ] CHK017 Are requirements present for concurrent/conflicting actions on the same card, and do they specify a deterministic resolution rather than leaving the outcome undefined? [Coverage/Clarity, Spec §8 E-07]
- [ ] CHK018 Are requirements present for invalid spending-limit inputs (negative, zero, wrong currency, over-precision, out-of-bounds), each with a distinguishable rejection reason? [Coverage, Spec §8 E-05]
- [ ] CHK019 Are requirements present for stale/eventually-consistent reads (propagation lag on freeze, limit-change, and transaction-feed visibility), stating expected behavior during the lag window rather than treating it as undefined? [Coverage, Spec §8 E-08]
- [ ] CHK020 Are requirements present for permission-boundary violations (e.g., an ops/compliance actor without the correct role attempting a restricted read), including what is and is not logged? [Coverage, Spec §8 E-13]
- [ ] CHK021 Are requirements present for fraud-adjacent/suspicious-pattern scenarios scoped to this specific feature, rather than deferred to a generic "fraud is out of scope" statement? [Coverage, Spec §8 E-14/E-20]
- [ ] CHK022 For each edge case, is the user-visible result stated separately from the audit/compliance consequence, so the two cannot be conflated? [Clarity, Spec §8]
- [ ] CHK023 Is every edge case that is deliberately NOT resolved (e.g., automatic card suspension on account-eligibility loss) explicitly flagged as an out-of-scope gap rather than silently omitted? [Completeness, Spec §8 E-15]

## Verification Requirement Quality

- [ ] CHK024 Does every mid-level objective have a stated verification approach, given no test suite will actually be produced for this document-only deliverable? [Completeness, Spec §9]
- [ ] CHK025 Are the verification categories (unit, integration, e2e, fixtures, reconciliation, manual compliance review) each populated with feature-specific content, rather than one being a placeholder or omitted? [Completeness, Spec §9]
- [ ] CHK026 Do the low-level tasks' acceptance criteria read as checkable pass/fail statements (a definition of done), rather than as vague intentions? [Measurability, Spec §10]
- [ ] CHK027 Is the reconciliation check's input and output stated concretely enough that a reader could determine what a "mismatch" would look like? [Clarity, Spec §9]
- [ ] CHK028 Are manual compliance review checkpoints tied to a concrete trigger (e.g., before a policy change ships, quarterly sampling) rather than left as an open-ended "review periodically"? [Clarity, Spec §9]

## Measurable Performance Target Quality

- [ ] CHK029 Is every latency, propagation, consistency-lag, and availability target expressed as a specific number or bound, with no lingering vague qualifier ("fast", "reliable", "scalable")? [Measurability, Spec §5]
- [ ] CHK030 Does every performance target carry an explicit `[ASSUMPTION]` label and a one-line rationale for why the number is reasonable in this FinTech context? [Traceability/Assumption, Spec §5]
- [ ] CHK031 Are pagination bounds (default/maximum page size) and rate-limit thresholds stated as specific numbers rather than left to implementer discretion? [Measurability, Spec §5]
- [ ] CHK032 Is the spending-limit floor/ceiling stated as a specific number with currency and decimal-precision rules attached, rather than left as an open range? [Measurability, Spec §5/§6]
- [ ] CHK033 Is there a consolidated statement of which read/write paths are strongly consistent versus eventually consistent, so a reader isn't left to infer consistency semantics from scattered mentions? [Clarity, Spec §5]

## FinTech Security, Privacy & Compliance Coverage

- [ ] CHK034 Are PAN/CVV handling rules (masking format, never-log, never-persist-beyond-hand-off) stated as explicit requirements rather than implied by omission? [Completeness, Spec §6 Redaction]
- [ ] CHK035 Is there a requirement stating that ops/compliance's inability to view full PAN/CVV is enforced as a hard boundary (not merely a UI-level redaction)? [Clarity, Spec §4 FR-23]
- [ ] CHK036 Are audit-event minimum fields (actor, target, prior/new state, timestamp) specified per event type, rather than described only in generic terms? [Completeness, Spec §4 FR-04/FR-11/FR-15/FR-22]
- [ ] CHK037 Is audit-record immutability stated as a requirement (no update/delete path), not just assumed? [Clarity, Spec §5 NFR-04]
- [ ] CHK038 Is a retention period stated for audit records, and is it labeled as an assumption requiring real-world regulatory confirmation? [Assumption, Spec §5 NFR-05]
- [ ] CHK039 Does a requirement exist for auditing the auditors — i.e., recording when an internal ops/compliance actor reads a card's data, including denied attempts? [Coverage, Spec §4 FR-22]
- [ ] CHK040 Are role/ownership authorization checks specified as server-side/data-layer enforcement rather than described ambiguously enough to be satisfied by client-side hiding alone? [Clarity, Spec §6 Authorization boundaries]
- [ ] CHK041 Is encryption of PAN/CVV in transit and at rest stated as a requirement, with the exact cipher/algorithm choice correctly left as an out-of-scope implementation detail (not over-specified for a document-only spec)? [Consistency, Spec §5 NFR-01]

## README Section Reference Quality

- [ ] CHK042 Does a requirement or plan exist requiring `README.md`'s industry-best-practices section to cite exact `specification.md` section numbers, rather than describing practices in the abstract? [Traceability, Plan §2d]
- [ ] CHK043 Is it specified that `README.md` must contain all three rows `TASKS.md` requires (student & task summary; rationale; industry best practices), with none merged away or omitted? [Completeness, Plan §2d]
- [ ] CHK044 Is there a defined process step for re-validating README section citations if `specification.md`'s section numbering changes later? [Consistency, Plan §4 Sequencing]

## Ambiguities, Conflicts & Assumptions

- [ ] CHK045 Is the `[ASSUMPTION]` marker used identically (same literal marker) across `specification.md` and any other deliverable that states assumptions, so a reader can grep for all assumptions in one pass? [Consistency, Constitution Assumption Labeling Discipline]
- [ ] CHK046 Are there any remaining requirements using unquantified adjectives ("robust", "intuitive", "seamless") that should have been converted to a measurable criterion or flagged as an assumption? [Ambiguity, Spec (all sections)]
- [ ] CHK047 Do any two requirements state conflicting behavior for the same trigger (e.g., freeze behavior on pending holds stated differently in two places)? [Conflict, Spec §4/§8]
- [ ] CHK048 Is the single-card-per-account scope decision justified with a rationale distinguishing it from a deferred (not merely unconsidered) multi-card scenario? [Clarity, Spec §1]

## Notes

- Items are phrased as requirement-quality questions ("Is X specified/quantified/consistent?"), not as implementation verification steps — there is no code to run against this checklist.
- Traceability coverage: 44/48 items (92%) carry an explicit `[Spec §…]`, `[Plan §…]`, or `[Constitution …]` citation, exceeding the 80% minimum.
- Recommended use: work top-to-bottom before final submission; any unchecked item after review should either be fixed in the cited deliverable or explicitly accepted as a documented, labeled gap (as already done for E-15).
