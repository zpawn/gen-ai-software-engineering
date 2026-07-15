<!--
Sync Impact Report
Version change: (none, template) → 1.0.0
Modified principles: N/A (initial ratification, template placeholders filled)
Added sections:
  - Core Principles I–VII (Requirement Traceability, Regulated-Environment Defaults by Default,
    Sensitive-Data Handling, Auditability, Explicit Failure Modes, Measurable SLOs,
    Verifiable Acceptance Criteria)
  - Documentation-Only Scope (Section 2)
  - Assumption Labeling Discipline (Section 3)
  - Governance
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md — ⚠ pending manual review (repo produces no plan.md;
    homework-3 deliverables are specification.md/agents.md/rules/README.md only — Constitution
    Check gate concept still applies to spec quality review, no code changes needed)
  - .specify/templates/spec-template.md — ✅ compatible as structural reference only per
    TASKS.md; not altered (assignment brief overrides template)
  - .specify/templates/tasks-template.md — ✅ compatible; low-level tasks in specification.md
    follow acceptance-criteria discipline consistent with Principle VII
  - .claude/skills/speckit-constitution/SKILL.md — ✅ no agent-specific naming found requiring
    correction
Follow-up TODOs: none
-->

# FinTech Specification (Document-Only) Constitution
<!-- Homework 3: Specification-Driven Design — governs specification.md, agents.md,
     .claude/rules/fintech-specification.md, and README.md -->

## Core Principles

### I. Requirement Traceability
Every requirement in `specification.md` MUST trace upward to a mid-level objective and, through
it, to the single high-level objective. Every mid-level objective MUST decompose downward into
one or more low-level tasks. No task MAY exist without a stated parent objective; no objective MAY
exist without at least one task or verification step that would prove it satisfied. Cross-cutting
requirements (edge cases, verification, performance) MUST reference the objective(s) they support
rather than floating as ungrounded prose.

**Rationale**: An engineering team or AI agent executing the spec must be able to answer "why does
this task exist?" and "how would I know the objective above it is done?" without guessing.
Untraceable requirements are the primary source of scope drift and unverifiable "done."

### II. Regulated-Environment Defaults
The specification MUST assume a regulated FinTech/banking context by default: least-privilege
access, explicit actor/role boundaries (end-user vs. internal ops/compliance vs. others as added),
and separation of duties for money-moving or limit-changing actions. Any relaxation of a regulated
default (e.g., skipping a compliance review step, allowing a self-approved override) MUST be
explicitly justified in the spec, not silently omitted.

**Rationale**: TASKS.md requires the system be "suitable for a regulated environment." Defaulting
to strict and requiring justification to loosen is safer than defaulting to loose and hoping
someone remembers to tighten it later.

### III. Sensitive-Data Handling
The specification MUST classify data elements the feature touches (e.g., PAN, card metadata,
balances, limits, personal identifiers) and state, per class, at minimum: what may be logged, what
must be masked or tokenized, retention expectations, and who/what role may view it. Implementation
notes in `agents.md` and `.claude/rules/fintech-specification.md` MUST restate the handling rules
relevant to code an agent might later write (e.g., "never log full PAN") so the rule survives
outside the spec document alone.

**Rationale**: Sensitive-data leakage (via logs, error messages, or over-broad API responses) is a
top real-world FinTech incident class. Stating the rule once in the spec is not enough if the
agent guidance doesn't repeat it at the point of consequence.

### IV. Auditability
Every mid-level objective involving a state change (create, freeze, limit change, dispute, etc.)
MUST specify what audit trail it produces: actor, action, before/after state, and timestamp
semantics, at minimum. The spec MUST state whether audit records are immutable/append-only and
who (which role) may read them. Silence on audit trail for a stateful action is treated as a spec
defect, not an implicit "not needed."

**Rationale**: Ops/compliance stakeholders (named in TASKS.md) require after-the-fact
reconstruction of "what happened and who did it." An audit story bolted on later is usually
incomplete; stating it per-objective forces the decomposition to account for it.

### V. Explicit Failure Modes
For each significant flow, the specification MUST enumerate applicable failure modes — empty
states, partial failures, concurrent/conflicting actions, invalid limits, stale data, permission
boundaries, and fraud-adjacent patterns — scoped to the chosen feature. Each enumerated failure
mode MUST state the expected user-visible outcome and, where relevant, the compliance/audit
implication. A flow with no stated failure modes MUST NOT be treated as complete.

**Rationale**: TASKS.md grades depth of edge-case anticipation explicitly. Undocumented failure
modes are the gap between a spec that "reads well" and one an agent can actually implement without
inventing behavior.

### VI. Measurable SLOs
Non-functional expectations (latency, availability, throughput, time-to-consistency after writes,
pagination/rate limits, batch sizes) MUST be stated as concrete numbers or ranges, never as vague
qualifiers ("fast", "reliable", "scalable"). Every such target that is not derived from a cited
external source MUST be labeled `[ASSUMPTION]` inline, with a one-line justification of why the
number is reasonable for the feature's FinTech context.

**Rationale**: A number an implementer or agent can build and test against is falsifiable; "should
be fast" is not. Labeling assumptions keeps invented numbers honest instead of presenting guesses
as requirements.

### VII. Verifiable Acceptance Criteria
Every low-level task MUST end with acceptance criteria or a definition of done phrased as a
checkable statement (observable outcome, not implementation step). Every mid-level objective MUST
state how it would be verified — review checkpoint, documented test category, fixture/reconciliation
check, or manual compliance review — even though this is a document-only deliverable and no test
suite is produced. Vague verification statements ("make sure it works") are non-conformant.

**Rationale**: TASKS.md explicitly grades whether tasks are "phrased so an implementer could check
them off." Verification-as-documentation is the substitute for an actual test suite in a
document-only assignment, so it must carry real signal.

## Documentation-Only Scope

This repository produces specification artifacts only. No production code, API contracts/schemas,
UI screens, database schemas, or infrastructure definitions may be authored as deliverables, per
TASKS.md and the user's explicit instruction. Where a concrete example would normally require code
(e.g., an API request/response shape), the specification MUST describe it in prose or a labeled
`[ASSUMPTION]` table (field name, purpose, sensitivity class) rather than as a code block or schema
definition. `specification-TEMPLATE-example.md` is a structural reference only — its content is
non-authoritative; TASKS.md is the authoritative brief and takes precedence on any conflict.

## Assumption Labeling Discipline

Any statement in `specification.md`, `agents.md`, or `.claude/rules/fintech-specification.md` that
is a design assumption rather than a requirement copied or directly derived from TASKS.md MUST be
tagged inline with `[ASSUMPTION]` (or an equivalent explicit marker used consistently across all
deliverables) followed by a brief rationale. This includes: numeric SLO targets, invented actor
names beyond end-user/ops-compliance, hypothetical system state used for "beginning/ending context,"
and any FinTech practice added beyond the seed requirements in TASKS.md. Reviewers (human or agent)
MUST be able to grep for the marker and enumerate every assumption in the package.

## Governance

This constitution governs the specification package produced for Homework 3 and supersedes ad hoc
formatting or scoping choices made elsewhere in the repository (including
`specification-TEMPLATE-example.md`, which is structural reference only). Any amendment to this
constitution MUST: (1) be captured as an edit to this file, (2) bump the version per the policy
below, (3) update the Sync Impact Report at the top of this file, and (4) note any deliverable
(`specification.md`, `agents.md`, `.claude/rules/fintech-specification.md`, `README.md`) that must
be revisited for consistency.

**Versioning policy** (semantic versioning applied to this document):
- MAJOR: Removal or backward-incompatible redefinition of a Core Principle.
- MINOR: Addition of a new principle or materially expanded guidance in an existing section.
- PATCH: Wording clarifications, typo fixes, non-semantic edits.

**Compliance review**: Before finalizing `specification.md`, `agents.md`, and
`.claude/rules/fintech-specification.md`, verify each against the seven Core Principles above.
Any deliberate deviation MUST be documented in `README.md` under Rationale, explaining why the
principle does not apply or how it is satisfied by an alternative mechanism.

**Version**: 1.0.0 | **Ratified**: 2026-07-15 | **Last Amended**: 2026-07-15
