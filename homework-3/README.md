# Homework 3: Virtual Card Lifecycle Specification

## Student & Task Summary

**Student**: ilia makarov

This submission is a document-only specification package for a virtual-card lifecycle feature in a regulated FinTech application, per `TASKS.md`. Deliverables: a layered `specification.md` (7 mid-level objectives, 26 functional requirements, 9 non-functional/performance requirements, 20 edge cases, a verification strategy, and 29 low-level tasks), `agents.md` (AI-agent guidance), `.claude/rules/fintech-specification.md` (persistent Claude Code rules), and this README. No application code, API contracts, UI, or database schema were produced — the graded artifact is the specification itself.

## Rationale

### Why virtual-card lifecycle

Virtual-card lifecycle was chosen from `TASKS.md`'s suggested domain list because it is small enough to decompose exhaustively within this assignment's scope, yet naturally forces every cross-cutting concern the rubric grades: it has real state (a status machine — `ACTIVE`/`FROZEN`/`CLOSED`), real money (a spending limit with currency and precision rules), real sensitive data (PAN/CVV redaction), a real internal-vs-external-actor split (end-user vs. ops/compliance), and a real audit story (every state change is compliance-relevant). A feature like "notifications" or "spending caps" alone would not force all of these simultaneously; virtual-card lifecycle does, without needing to also specify KYC onboarding, card-network integration, or dispute resolution — each of which is explicitly out of scope (`specification.md` §1).

### Why one card per account, not a multi-card portfolio

Multi-card portfolios add a second dimension of complexity (card-to-card transfers, aggregate account-level limits, shared audit trails across cards) that would dilute the depth of decomposition the rubric rewards. Single-card-per-account is documented as a deliberate, labeled `[ASSUMPTION]` (`specification.md` §1), not an oversight — the spec's own Clarifications log (`specification.md` §"Clarifications") confirms it as final rather than tentative.

### How the assumed performance targets were chosen

Every numeric target in `specification.md` §5 (the Performance table) is labeled `[ASSUMPTION]` with an inline one-line rationale, per the project constitution's Assumption Labeling Discipline (`.specify/memory/constitution.md`). The general approach:

- **Read-path latency** (card view, ops lifecycle query) was set to sub-second targets (≤300ms / ≤1s) because these are checked frequently, often as a precondition to a purchase decision — a slow read path would be user-visible and disproportionately annoying relative to its actual cost to serve.
- **Propagation windows** (freeze, limit-change → authorization network, ≤5s) reflect that these are safety-critical, user-initiated actions (e.g., freezing a lost card) where the user reasonably expects near-immediate effect, but the target still respects that propagation to an external authorization network is realistically eventually-consistent, not instantaneous — so the number is a bound on an acknowledged lag, not a false claim of synchronous guarantees.
- **Transaction feed consistency lag** (≤60s) and **pagination bounds** (default 20 / max 100) follow standard practice for eventually-consistent financial feeds and pagination ergonomics respectively — chosen to be "recent/usable enough" without overpromising real-time settlement visibility.
- **Spending-limit floor/ceiling** (1,000–1,000,000 minor units) and the **rate-limit** (≤10 requests/10 minutes) were chosen conservatively during the `/speckit-clarify` pass specifically to bound fraud exposure and abuse (freeze-thrashing, retry storms) without being so strict they'd block a legitimately anxious user reacting to a lost card.

None of these numbers are derived from a cited external SLA or regulation — they are reasoned defaults appropriate to a consumer FinTech context, and every one is flagged as such so a reader never mistakes an assumption for a confirmed requirement. Two items are explicitly flagged as needing real-world confirmation before production use: the audit-retention period (`specification.md` §5 NFR-05) and the limit-policy compliance sign-off (`specification.md` §9, "Manual compliance review checkpoints").

### How verification depth was chosen

`specification.md` §9 documents six verification categories (documentation review, unit, integration, e2e, fixtures, reconciliation, manual compliance review) rather than just "tests will be written," because this is a document-only deliverable with no test suite to actually run — the verification *strategy* has to carry the signal a real test suite normally would. Depth was calibrated so every mid-level objective has at least one verification method, and negative/absence tests (e.g., "no code path returns full PAN to ops/compliance") are called out explicitly, since these are the tests most likely to be silently skipped in a real implementation.

## Industry Best Practices

Each practice below is mapped to the exact `specification.md` section where it appears.

| Practice | Where it appears in `specification.md` |
|---|---|
| Requirement traceability (every requirement traces to a goal and a task) | §2 Mid-Level Objectives, §4 Functional Requirements (each FR cites its MO), §10 Low-Level Tasks (each task cites its MO), and the closing "Traceability check" paragraph |
| Least-privilege, role-scoped access control | §3 Stakeholders and Permissions, §5 Non-Functional, Security, Privacy, Compliance, Auditability, Reliability, and Performance (NFR-03) |
| PCI-DSS-aligned sensitive-data handling (PAN/CVV masking, no persistence beyond hand-off) | §6 Implementation Notes ("Redaction"), §5 (NFR-01, NFR-02) |
| Immutable, append-only audit trail | §5 (NFR-04), §4 Functional Requirements (FR-04, FR-11, FR-15, FR-22) |
| "Audit the auditors" — logging access to sensitive data, not just changes to it | §4 Functional Requirements (FR-22), §8 Edge Cases and Failure Modes (E-13) |
| Idempotency keys for all state-changing writes | §6 Implementation Notes ("Idempotency"), §4 Functional Requirements (FR-05, FR-12) |
| Optimistic concurrency control for competing writes | §6 Implementation Notes ("Concurrency"), §8 Edge Cases and Failure Modes (E-07) |
| Typed/categorized error semantics (no leaking sensitive data in errors) | §6 Implementation Notes ("Error semantics") |
| Explicit money representation (integer minor units + ISO 4217) | §6 Implementation Notes ("Money format", "Currency") |
| Rate limiting against abuse/thrash patterns | §5 (NFR-09), §4 Functional Requirements (FR-25), §8 Edge Cases and Failure Modes (E-20) |
| Feature-scoped fraud/suspicious-pattern signals | §4 Functional Requirements (FR-21) |
| Explicitly labeled assumptions instead of silent invented facts | Constitution's Assumption Labeling Discipline (`.specify/memory/constitution.md`), applied throughout §5, §6, and the Clarifications log in `specification.md` |
| Documentation-only scope boundary for a specification exercise | §1 High-Level Objective and Scope Boundary ("Out of scope") |
| Definition of Done for the deliverables themselves | §11 Definition of Done for the Document Deliverables |
