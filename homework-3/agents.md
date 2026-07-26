# AI Agent Guidance: Virtual Card Lifecycle

> Guidance for any AI coding agent (Claude, Copilot, Cursor, or other) working in this repository. This repository is **document-only** — there is no application code to run against these rules yet. This file governs how an agent should *reason* about the domain and *behave* if this specification is ever implemented, and how it should behave right now while the repository contains only specification artifacts. Every rule below cites the `specification.md` section it derives from; introduce no new unlabeled numeric or regulatory claim beyond what is already in `specification.md`.

## 1. Hypothetical Tech-Stack Assumptions

No language, framework, or database is prescribed by `TASKS.md` or `specification.md` — this is intentional. If asked to eventually implement this spec:

- Do not choose a stack silently. State the choice as an explicit `[ASSUMPTION]` (matching the marker convention used throughout `specification.md`) and give a one-line reason, exactly as `specification.md` §5/§6 do for its own numeric assumptions.
- Whatever stack is chosen, monetary values MUST be represented as integer minor units (e.g., cents) paired with an explicit ISO 4217 currency code — never floating-point decimals (`specification.md` §6, "Money format"). Decimal precision is fixed at 2 places per the spec's assumed currency (§6 "Currency").
- Card IDs, transaction IDs, and audit event IDs MUST be opaque, non-guessable, sortable-by-creation identifiers, never the raw PAN, a sequential integer, or anything derived from PII (`specification.md` §6, "ID conventions").

## 2. Domain Rules (Banking / FinTech)

- Exactly one non-`CLOSED` virtual card per account. Eligibility = KYC-complete AND good-standing AND no existing non-`CLOSED` card (`specification.md` §4 FR-01/FR-02).
- Role boundaries are absolute, not advisory: an end-user (cardholder) may only act on their own account's card; an internal ops/compliance user may read lifecycle/audit data for any card but has no direct freeze/unfreeze/limit-change capability and no path to full PAN/CVV under any circumstance (`specification.md` §3 Stakeholders and Permissions, §4 FR-12a/FR-23).
- A freeze blocks only *future* authorization approvals — it never retroactively cancels a hold placed before the freeze, and a limit change never retroactively invalidates a pending hold either (`specification.md` §8 E-06, E-18).
- Treat card issuance, the authorization network, and the transaction feed strictly as hypothetical external dependencies, described only by contract and failure behavior — never invent or assume a concrete real-world API for them (`specification.md` §7).

## 3. Naming & Style Conventions

- Use the error-code taxonomy from `specification.md` §6/§10 T-022 verbatim when describing failure outcomes: `INELIGIBLE`, `ALREADY_EXISTS`, `INVALID_LIMIT`, `CARD_CLOSED`, `CONFLICT`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`. Do not invent new error codes without adding them to that taxonomy first.
- Card status values are exactly `ACTIVE`, `FROZEN`, `CLOSED` (`specification.md` §4 FR-09). Transaction status values are exactly `PENDING`, `SETTLED`, `DECLINED`, `REVERSED` (`specification.md` §4 FR-18/FR-24).
- Audit event type names are exactly `CARD_CREATED`, `CARD_FREEZE_CHANGED`, `CARD_LIMIT_CHANGED`, `ACCESS_DECISION` (`specification.md` §4 FR-04/FR-11/FR-15/FR-22). Do not rename or abbreviate these in any future implementation artifact.

## 4. Testing & Verification Expectations

Even though this repository currently has no test suite (it is documentation-only), any future implementation MUST honor the verification depth already specified in `specification.md` §9:

- Cover unhappy paths, not just the happy path: eligibility rejection, duplicate-card rejection, invalid-limit boundary values, denied ops/compliance access (`FORBIDDEN`), rate-limit rejection, transient vs. terminal issuance-provider failures, and duplicate/reversed transaction-feed delivery (`specification.md` §8 E-01, E-05, E-13, E-16, E-09, E-19, E-20).
- A negative test asserting the **absence** of a capability (e.g., "no code path returns full PAN/CVV to the ops/compliance role") is as required as a positive happy-path test — `specification.md` §9 explicitly calls this out for MO-06.
- Reconciliation checks (audit-trail-to-current-state replay, transaction-feed-count-vs-paginated-count) are not optional cleanup — they are the primary mechanism by which Principle IV (Auditability) is verified in a document-only deliverable (`specification.md` §9 "Reconciliation checks").

## 5. Security & Compliance Constraints

**Never, under any circumstance:**

- Log the full PAN (card number) or CVV, in any log line, error message, stack trace, or diagnostic output — not even at debug level (`specification.md` §6 "Redaction", §5 NFR-02).
- Log or persist any secret (API keys, provider credentials, signing keys) in plaintext, in a commit, or in a document artifact.
- Log or persist a raw authorization-network payload — authorization requests/responses may themselves carry more of the PAN than this system needs to retain (`specification.md` §3 "Authorization network" contract boundary).
- Display, export, or return unredacted PII (full PAN, CVV, or anything beyond the last-4-digit masked PAN and expiry) to any role, end-user or internal — this is enforced as a hard, server-side boundary, not a UI-level redaction (`specification.md` §4 FR-07/FR-23, §6 "Authorization boundaries").

**Always:**

- Treat every state-changing action (creation, freeze, unfreeze, limit-change) as requiring its own caller-supplied idempotency key — freeze and unfreeze are distinct idempotent actions, never a shared toggle (`specification.md` §6 "Idempotency").
- Enforce authorization checks server-side for every request path — an end-user request scoped to `account_id == session.account_id`, an ops/compliance request scoped to a verified internal role claim (`specification.md` §6 "Authorization boundaries").
- Treat audit records as append-only/immutable, with no update or delete path, ever (`specification.md` §5 NFR-04).
- Use explicit money formats: integer minor units + ISO 4217 currency code, 2 decimal places, never a bare float (`specification.md` §6 "Money format", "Currency").
- Emit an audit event for every state-changing action and for every ops/compliance read (including denied reads) — an audit event and the state change it records MUST be treated as a single committed unit; never let a read reflect a state change whose audit event isn't yet durable (`specification.md` §5 NFR-08, §8 E-11).
- Retain audit records for a minimum of `[ASSUMPTION] 7 years` (`specification.md` §5 NFR-05) — treat this as a placeholder requiring real-world regulatory confirmation, not a settled figure (see §7 below).
- Rate-limit end-user state-changing requests to `[ASSUMPTION] ≤10 per card per rolling 10 minutes`, rejecting excess with `RATE_LIMITED` rather than silent delay or drop (`specification.md` §5 NFR-09).

## 6. Mandatory Edge-Case Behavior

Condensed from `specification.md` §8 (20 edge cases, E-01–E-20) into imperative rules an agent must follow:

- **Creation**: reject duplicate-card requests distinctly from generic errors (E-01); distinguish transient-retry-safe from terminal issuance failures (E-16); never create a second card on idempotency-key replay (E-10).
- **Freeze/unfreeze**: repeated same-state requests are no-op successes, not errors, and MUST NOT emit a spurious audit event (E-02/E-03); `CLOSED` cards reject freeze/unfreeze attempts (E-04); a freeze never retroactively cancels a pre-existing pending hold (E-18).
- **Spending limit**: reject invalid limits (negative, zero, non-finite, wrong currency, over-precision, out-of-bounds) with a specific reason, before persistence (E-05); a limit change while a hold is outstanding is accepted but doesn't retroactively invalidate that hold (E-06).
- **Concurrency**: two competing writes on the same card resolve via optimistic-concurrency version check — the loser gets `CONFLICT` and must retry, never a silent overwrite or merge (E-07).
- **Transactions**: deduplicate by transaction ID on at-least-once feed delivery (E-09); reject expired/malformed pagination cursors distinctly from an empty page (E-12); represent a reversal as a new linked entry, never a silent edit of the original (E-19).
- **Ops/compliance**: a denied access attempt (`FORBIDDEN`) still emits an `ACCESS_DECISION` audit event — auditing the auditors is not optional (E-13).
- **Rate limiting**: reject excess state-changing requests explicitly (`RATE_LIMITED`), never via silent delay, drop, or queuing (E-20).

## 7. Ambiguity Handling

If a task in this repository (or a future implementation of this spec) requires a regulatory, legal, or compliance fact not already stated in `specification.md` — e.g., the *actual* required audit-retention period for a specific jurisdiction, or whether a specific limit ceiling satisfies a real regulator — **stop and document the ambiguity as an open question**. Do not invent a plausible-sounding regulatory fact and present it as settled. `specification.md` already models this discipline: NFR-05's 7-year retention figure and the manual compliance review checkpoint in §9 are both explicitly labeled `[ASSUMPTION]` with a note that they require real-world confirmation before production use — follow that same pattern rather than resolving the ambiguity silently.
