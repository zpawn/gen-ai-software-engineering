# Virtual Card Lifecycle Specification

> Document-only specification. No code, API contracts, UI screens, or database schemas are defined here — per `TASKS.md` and `.specify/memory/constitution.md`. Statements not directly derived from the assignment brief are marked `[ASSUMPTION]` with a one-line rationale, per the constitution's Assumption Labeling Discipline.

## 1. High-Level Objective and Scope Boundary

**High-level objective**: Let an eligible end-user hold and control the lifecycle of a single virtual card — view it, create it, freeze/unfreeze it, set its spending limit, and review its transactions — while giving internal ops/compliance staff full visibility into lifecycle, limit, and access events for that card, without ever exposing full card number (PAN) or CVV to any human, end-user or internal.

**Scope boundary** (in one sentence): This specification covers the *card lifecycle and its own audit trail* for a single virtual card per eligible account — it does not cover how the card is manufactured/issued at the network level, how an authorization is scored for fraud, or how any UI/API/code is built to satisfy it.

**Out of scope** (explicit, per assignment brief):
- Physical card issuance, manufacturing, or shipping.
- Chargeback / dispute resolution workflows (may reference the existence of a dispute-intake feature but does not specify it).
- KYC/identity onboarding (this spec assumes an account and its KYC status already exist and are queryable as a boolean eligibility signal).
- Card-network integration implementation (e.g., ISO 8583 message formats, network certification) — treated as a hypothetical external dependency (§7).
- Any actual UI layout, REST/GraphQL contract, programming language, or database schema.
- Multi-card-per-account portfolios, joint/shared cards, and card-to-card transfers — `[ASSUMPTION]` single card per account keeps the spec bounded enough to fully decompose within the assignment's depth expectations; multi-card is a natural v2 extension, not this feature.

## Clarifications

### Session 2026-07-15

Resolved without user interaction, per explicit instruction to choose conservative FinTech defaults and document them rather than ask. Each decision is integrated into the relevant section below; this log records the decision and its immediate rationale.

- Q: What is the maximum number of virtual cards per account, and what exactly gates creation? → A: Exactly one non-`CLOSED` card per account (already stated in §1/§4); eligibility = KYC-complete AND good-standing AND no existing non-`CLOSED` card. No change to a stricter/looser rule — confirmed as final, not tentative.
- Q: Who may freeze/unfreeze, and what happens to a pending (uncleared) authorization hold placed before the freeze? → A: Only the cardholder (end-user) may freeze/unfreeze their own card directly; ops/compliance has no direct freeze/unfreeze capability in this spec's scope (only a documented override flow, out of scope). A freeze blocks only *future* authorization approvals — it does NOT retroactively cancel a hold already placed before the freeze took effect (symmetric to the existing limit-change precedent in E-06). See FR-10 and new Edge Case E-18.
- Q: What are the spending-limit floor, ceiling, currency, and decimal precision? → A: `[ASSUMPTION]` Floor = 1,000 minor units (10.00 in a 2-decimal currency); Ceiling = 1,000,000 minor units (10,000.00); single fixed currency per card, decimal precision = the currency's ISO 4217 minor-unit exponent (2 for USD/EUR-class currencies; this spec assumes a 2-decimal currency throughout and does not attempt to generalize to 0- or 3-decimal currencies). A limit change is effective immediately upon acceptance, subject to the existing propagation window (§5). See §5 Performance table and FR-13/FR-14.
- Q: How are simultaneous freeze/unfreeze and simultaneous limit updates on the same card resolved? → A: Single-writer-wins via optimistic concurrency (version/etag check, already specified in §6/E-07); only one state-changing write may be "in flight" and win per card at a time — the losing concurrent request always receives `CONFLICT` and must retry against latest state, never a silent merge or last-write-wins-by-timestamp. Confirmed as final.
- Q: Is idempotency required for every state-changing action, including freeze and unfreeze as distinct actions? → A: Yes — creation, freeze, unfreeze, and limit-change each require their own caller-supplied idempotency key (freeze and unfreeze are tracked as distinct idempotent actions, not a single toggle), per §6 Idempotency. Confirmed as final, extended explicitly to cover freeze and unfreeze as separate keyed actions (FR-12 updated).
- Q: How are reversed/refunded transactions handled in the transaction feed and pagination? → A: A settled transaction MAY later be superseded by a `REVERSED` status update (e.g., merchant-initiated refund or network reversal) delivered as a separate feed event referencing the original transaction ID; the end-user's paginated view MUST show the reversal as a linked, distinct entry (never a silent edit of the original record), per new FR-24 and Edge Case E-19 immutability of the original record is preserved.
- Q: What suspicious-pattern examples are in scope for this small feature (not a full fraud engine)? → A: Three concrete, feature-scoped example reason codes are adopted: (1) `FREEZE_THRASHING` — more than `[ASSUMPTION] 5` freeze/unfreeze cycles by the same actor within `[ASSUMPTION] 1 hour`; (2) `LIMIT_RAMP_TO_CEILING` — limit raised to within `[ASSUMPTION] 5%` of the policy ceiling more than once within `[ASSUMPTION] 24 hours`; (3) `POST_FREEZE_AUTH_BURST` — more than `[ASSUMPTION] 3` authorization attempts against a `FROZEN` card within `[ASSUMPTION] 10 minutes`. See updated FR-21.
- Q: What are the rate-limit targets for state-changing actions, to bound abuse (e.g., freeze/unfreeze thrashing)? → A: `[ASSUMPTION]` End-user state-changing actions (freeze, unfreeze, limit-change) are capped at 10 requests per card per rolling 10-minute window; requests beyond the cap receive a `RATE_LIMITED` outcome, not silent throttling. See new NFR-09 and Edge Case E-20.
- Q: What is the Definition of Done for the four document deliverables themselves (not the hypothetical system)? → A: A concrete DoD checklist is added as new §11, covering completeness, traceability, assumption-labeling, and constitution-conformance for `specification.md`, `agents.md`, `.claude/rules/fintech-specification.md`, and `README.md`.

## 2. Mid-Level Objectives

Each objective is observable: it names a change in system-visible state or behavior that would let a reviewer confirm success without inspecting implementation.

| ID | Objective |
|----|-----------|
| **MO-01** | An eligible end-user who has no active card can create exactly one virtual card, and the card becomes visible to them in `ACTIVE` status without ever having displayed full PAN or CVV during or after creation. |
| **MO-02** | An end-user can view their card's identifying details (masked PAN, expiry, status, current limit, currency) at any time, and the response never contains the full PAN or CVV in any field. |
| **MO-03** | An end-user can freeze and unfreeze their own card, and a freeze observably blocks new authorization approvals while unfreeze observably restores them, within an assumed propagation window. |
| **MO-04** | An end-user can set or change their card's spending limit within policy bounds, and subsequent authorization decisions observably respect the new limit within an assumed propagation window. |
| **MO-05** | An end-user can retrieve their card's transaction history as stable, paginated pages, reflecting the hypothetical transaction feed within an assumed consistency lag. |
| **MO-06** | An ops/compliance user can retrieve the full lifecycle event, limit-change, and access-decision history for any card by card ID or account ID, and this history never contains full PAN or CVV in any field, screen, or export. |
| **MO-07** | Every state-changing action in MO-01, MO-03, MO-04 produces an immutable, timestamped audit record sufficient for an ops/compliance user to reconstruct "who did what, when, from what prior state" without access to raw PAN/CVV. |

## 3. Stakeholders and Permissions

| Role | Description | Can | Cannot |
|------|-------------|-----|--------|
| **End-user (cardholder)** | Owner of the account the card is issued against. | View own card (masked), create own card (if eligible), freeze/unfreeze own card, set own card's limit (within policy bounds), view own card's paginated transactions. | View any other account's card or transactions; view own full PAN/CVV after initial issuance; view internal audit/access-decision logs; override policy-bound limit ceilings. |
| **Internal ops/compliance user** | Support agent or compliance analyst investigating an account or pattern. | View lifecycle events, limit-change history, access-decision logs, and suspicious-pattern flags for any card; view masked PAN (last 4 digits) and card status/limit; annotate a card with a case reference. | View full PAN or CVV under any circumstance; freeze/unfreeze or change limits on a user's card directly (must go through a documented override flow `[ASSUMPTION]` — out of scope to specify here, noted only as a boundary); export raw audit records outside the compliance tooling's access-controlled surface. |
| **Fraud/risk system (automated)** | Hypothetical automated pattern-detection process. | Emit suspicious-pattern flags attached to a card, consumed by ops/compliance. | Change card state directly; this spec treats it strictly as a producer of read-only signals ops can view (MO-06). |
| **Card issuance provider (external, hypothetical)** | System of record for PAN/CVV generation and physical card data. | Hold and return full PAN/CVV exactly once at creation time to the calling system for hand-off; provide masked/tokenized reference thereafter. | Anything beyond issuance and a token/reference lookup — see §7 for its contract boundary. |
| **Authorization network (external, hypothetical)** | Approves/declines real-time purchase attempts against the card. | Query current card status/limit at authorization time; report approve/decline outcomes. | Persist or return PAN/CVV to this system beyond what it needed to authorize. |
| **Transaction feed (external, hypothetical)** | Posts settled/pending transactions for display. | Deliver transaction records (amount, merchant, timestamp, status) per card, at-least-once. | Guarantee real-time delivery — see MO-05 consistency lag. |

**Permission rule (cross-cutting, ties to constitution Principle II & III)**: No role — end-user or internal — is ever returned full PAN or CVV via any read path specified here, except the one-time hand-off from the issuance provider at creation (FR-01, §6 Redaction).

## 4. Functional Requirements

Each requirement is tagged with the mid-level objective(s) it serves (Principle I: Requirement Traceability).

### Card Creation

- **FR-01** (MO-01): The system MUST allow an end-user to request card creation only if the account's eligibility signal is `true` (`[ASSUMPTION]` eligibility = KYC-complete AND account in good standing AND no existing non-`CLOSED` card on the account — KYC onboarding itself is out of scope, so this spec only consumes the resulting boolean).
- **FR-02** (MO-01): The system MUST reject a creation request if the account already has a card in any status other than `CLOSED`, returning a user-visible "you already have a card" outcome (not a generic error).
- **FR-03** (MO-01): On successful creation, the system MUST receive full PAN/CVV from the issuance provider exactly once, persist only a masked/tokenized representation, and never re-request or re-display the full values afterward (see §6 Redaction).
- **FR-04** (MO-01, MO-07): On successful creation, the system MUST emit a `CARD_CREATED` audit event containing actor (the end-user), account ID, new card ID, initial status (`ACTIVE`), and timestamp.
- **FR-05** (MO-01): Card creation MUST be idempotent under retry: a repeated creation request with the same idempotency key MUST return the original created card rather than creating a second one (see §6 Idempotency).

### Card Viewing

- **FR-06** (MO-02): The system MUST let an end-user retrieve their own card's status, masked PAN (last 4 digits only), expiry month/year, currency, and current spending limit.
- **FR-07** (MO-02): The system MUST NOT include full PAN or CVV in any end-user-facing read response, log line, or error message, at any time after initial creation hand-off.
- **FR-08** (MO-02): If the account has no card, the view request MUST return a distinguishable "no card exists yet" state rather than an error, so the end-user experience can offer creation.

### Freeze / Unfreeze

- **FR-09** (MO-03): The system MUST let an end-user transition their own card from `ACTIVE` to `FROZEN` and back, but MUST reject the transition if the card is `CLOSED`.
- **FR-10** (MO-03): While a card is `FROZEN`, the system MUST cause subsequent authorization queries (§7) to be answered as "not authorizable due to freeze" rather than evaluated against the limit. A freeze MUST NOT retroactively cancel an authorization hold already placed before the freeze took effect — the freeze only blocks *new* approvals (see Edge Case E-18).
- **FR-11** (MO-03, MO-07): Every freeze/unfreeze transition MUST emit a `CARD_FREEZE_CHANGED` audit event with actor, card ID, prior status, new status, and timestamp.
- **FR-12** (MO-03): Freezing an already-frozen card (or unfreezing an already-active card) MUST be treated as a no-op success (idempotent from the user's perspective), not an error — see Edge Case E-02/E-03 in §8. Freeze and unfreeze are each tracked as distinct idempotent actions: freeze MUST accept its own caller-supplied idempotency key independent of unfreeze's key (see §6 Idempotency).
- **FR-12a** (MO-03): Only the cardholder (end-user) MAY freeze or unfreeze their own card directly; ops/compliance has no direct freeze/unfreeze capability within this spec's scope (any override is a separate, out-of-scope flow — see §3 permission rule for the ops/compliance role).

### Spending Limit

- **FR-13** (MO-04): The system MUST let an end-user set or update their card's spending limit to any value between the policy floor and ceiling — `[ASSUMPTION] 1,000 to 1,000,000 minor units` (10.00–10,000.00 in a 2-decimal currency; see §5) — in the card's assigned currency. A limit change is effective immediately upon acceptance, subject to the propagation window in §5.
- **FR-14** (MO-04): The system MUST reject a limit value that is negative, zero, non-finite, expressed with more decimal precision than the currency's minor-unit exponent allows (`[ASSUMPTION]` 2 decimal places, per §5/§6), in a currency other than the card's assigned currency, or outside the policy floor/ceiling, with a specific rejection reason.
- **FR-15** (MO-04, MO-07): Every accepted limit change MUST emit a `CARD_LIMIT_CHANGED` audit event with actor, card ID, prior limit, new limit, currency, and timestamp.
- **FR-16** (MO-04): A newly accepted limit MUST govern authorization decisions (§7) within the assumed propagation window (§5); an authorization evaluated before propagation completes MAY still see the prior limit (documented, not silently undefined — see Edge Case E-08).

### Transaction Viewing

- **FR-17** (MO-05): The system MUST let an end-user retrieve their card's transactions as pages of an assumed default/maximum size (§5), ordered most-recent-first, using an opaque cursor for subsequent pages.
- **FR-18** (MO-05): Each transaction record surfaced to the end-user MUST include amount (in minor units + currency), merchant descriptor, timestamp, and status (`PENDING`/`SETTLED`/`DECLINED`), and MUST NOT include full PAN.
- **FR-19** (MO-05): If the transaction feed has not yet delivered a transaction known to have occurred (per the authorization network), the system MUST surface the known-pending state rather than silently omitting it, where the upstream feed contract allows it (see §7 feed contract).
- **FR-24** (MO-05): A settled transaction that is later reversed (merchant refund or network reversal) MUST be surfaced as a distinct, linked `REVERSED` entry referencing the original transaction ID — the system MUST NOT silently edit or delete the original record (see Edge Case E-19).

### Ops/Compliance Visibility

- **FR-20** (MO-06): The system MUST let an ops/compliance user retrieve, by card ID or account ID, the full ordered history of `CARD_CREATED`, `CARD_FREEZE_CHANGED`, `CARD_LIMIT_CHANGED`, and access-decision events for that card.
- **FR-21** (MO-06): The system MUST let an ops/compliance user view any suspicious-pattern flags raised by the fraud/risk system for a card, including flag reason code and timestamp, without exposing the underlying full PAN. `[ASSUMPTION]` Three feature-scoped reason codes are in scope for this small feature (not a general fraud engine): `FREEZE_THRASHING` (>5 freeze/unfreeze cycles by the same actor within 1 hour), `LIMIT_RAMP_TO_CEILING` (limit raised to within 5% of the policy ceiling more than once within 24 hours), and `POST_FREEZE_AUTH_BURST` (>3 authorization attempts against a `FROZEN` card within 10 minutes).
- **FR-22** (MO-06, MO-07): Every ops/compliance read of a card's lifecycle/audit data MUST itself emit an `ACCESS_DECISION` audit event recording which internal actor viewed which card's data and when (auditing the auditors — Principle IV).
- **FR-23** (MO-06): The system MUST reject an ops/compliance request for full PAN/CVV at the authorization boundary (not merely omit it from a UI) — i.e., no code path exists for this role to retrieve it, this is not just a display-layer redaction.

### Rate Limiting (cross-cutting: freeze/unfreeze and limit-change)

- **FR-25** (MO-03, MO-04): The system MUST reject an end-user's state-changing request (freeze, unfreeze, or limit-change) on a given card with a `RATE_LIMITED` outcome once that card has received more than `[ASSUMPTION] 10` such requests within a rolling `[ASSUMPTION] 10-minute` window (see NFR-09, Edge Case E-20).

## 5. Non-Functional, Security, Privacy, Compliance, Auditability, Reliability, and Performance

### Security & Privacy

- **NFR-01**: PAN and CVV MUST be encrypted at rest and in transit end-to-end between the issuance provider and any component that transiently handles the creation hand-off; after masking/tokenization is persisted, no component in this feature's scope retains the raw values. `[ASSUMPTION: standard practice — PCI DSS-aligned handling; exact cipher/algorithm choice is an implementation detail out of scope for this spec.]`
- **NFR-02**: Only the last 4 digits of PAN and the expiry month/year MAY ever be displayed to the end-user or ops/compliance; CVV is never displayed or stored beyond the one-time creation hand-off.
- **NFR-03**: All card-lifecycle and audit endpoints (hypothetical) require authenticated, role-scoped access; an end-user's session MUST be scoped to their own account's card only; an ops/compliance session MUST be scoped by an internal role claim, not by account ownership.

### Compliance & Auditability

- **NFR-04** (Principle IV): Every event in FR-04, FR-11, FR-15, FR-22 MUST be append-only/immutable once written; no update or delete path exists for audit records within this feature's scope.
- **NFR-05**: Audit records MUST be retained for a minimum of `[ASSUMPTION: 7 years — a commonly cited floor for financial transaction/audit records under typical retention guidance (e.g., SOX-adjacent, card-network audit expectations); exact figure should be confirmed against the operator's actual regulatory jurisdiction before production use.]`
- **NFR-06**: Audit records MUST be readable by ops/compliance roles and MUST NOT be readable by the end-user role directly (the end-user sees only current-state views per FR-06, not the raw audit stream).

### Reliability

- **NFR-07**: Card state reads (FR-06) MUST be available with an assumed uptime target of `[ASSUMPTION: 99.9% monthly — a standard consumer-fintech read-path target, chosen because card viewing is a high-frequency, low-tolerance-for-downtime action; not derived from a cited SLA.]`
- **NFR-08**: A freeze/unfreeze or limit-change write (FR-09, FR-13) that fails partway (e.g., state persisted but audit event not yet durable) MUST NOT leave the card in an ambiguous status from the end-user's perspective — the read path (FR-06) MUST reflect only fully-committed transitions (see Edge Case E-11).
- **NFR-09**: `[ASSUMPTION]` End-user state-changing requests (freeze, unfreeze, limit-change) per card MUST be rate-limited to a maximum of 10 requests per rolling 10-minute window; requests beyond the cap MUST receive an explicit `RATE_LIMITED` outcome rather than silent delay or drop — chosen as a conservative bound against freeze-thrash-style abuse or client retry storms, cross-referenced with the `FREEZE_THRASHING` suspicious-pattern signal (FR-21) which triggers at a lower threshold so ops sees the pattern before the hard rate limit engages.

### Performance (assumed targets — all `[ASSUMPTION]`)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Card view read latency (FR-06) (p95) | `[ASSUMPTION] ≤ 300 ms` | Card status is checked frequently (e.g., before a purchase); a sub-second, near-instant feel is standard for consumer fintech read paths. |
| Freeze/unfreeze propagation to authorization decisions (FR-10) | `[ASSUMPTION] ≤ 5 seconds end-to-end` | A user freezing a lost card expects near-immediate effect; 5s is a defensible ceiling for an eventually-consistent propagation to an external authorization network without claiming synchronous real-time guarantees. |
| Limit-change propagation to authorization decisions (FR-16) | `[ASSUMPTION] ≤ 5 seconds end-to-end` | Same rationale as freeze propagation — user-initiated safety/control action, not a routine read. |
| Transaction feed consistency lag (MO-05, FR-19) | `[ASSUMPTION] ≤ 60 seconds from authorization network settlement to visibility` | Card transaction feeds are commonly eventually-consistent with upstream networks; 60s balances "recent enough to be useful" against not falsely promising real-time settlement visibility. |
| Transaction page size | `[ASSUMPTION] default 20, maximum 100 items per page` | Standard pagination ergonomics; bounds worst-case payload size and query cost. |
| Card creation end-to-end (FR-01–FR-04) (p95) | `[ASSUMPTION] ≤ 3 seconds`, including the synchronous issuance-provider round trip | Creation is a rarer, higher-latency-tolerant action than viewing, but still bounded to avoid the user perceiving the flow as hung. |
| Ops/compliance lifecycle query (FR-20) (p95) | `[ASSUMPTION] ≤ 1 second` for a single card's history | Investigative tooling needs to feel responsive during a live case review; single-card history is a bounded, indexable query. |
| Spending limit bounds (FR-13, FR-14) | `[ASSUMPTION] floor 1,000 minor units (10.00); ceiling 1,000,000 minor units (10,000.00); 2 decimal places` | A conservative consumer-card range: high enough for everyday spend, low enough to bound single-card fraud exposure; 2 decimals matches the common ISO 4217 minor-unit exponent for widely-issued currencies (USD/EUR-class) and keeps money-format math simple (§6). |
| State-changing request rate limit (FR-25) | `[ASSUMPTION] ≤ 10 requests per card per rolling 10 minutes` | Bounds abuse/thrash (freeze-toggling, retry storms) without restricting a legitimately anxious user reacting to a lost card. |

**Consistency & availability summary**: read paths (card view, transaction history, ops lifecycle query) are read-committed against the last fully-audited state (NFR-08); write paths are strongly consistent for the card's own status/limit fields and eventually consistent only with respect to the external authorization network and transaction feed (propagation/lag windows above). Availability target for all read paths is NFR-07's 99.9% monthly figure; write-path availability is assumed equal unless a write is rejected by NFR-09's rate limit, which is a deliberate rejection, not an availability failure.

## 6. Implementation Notes

These are guardrails for whoever (human or agent) later builds against this spec — not code, but constraints code must satisfy (Principle II, III).

- **Money format**: All monetary amounts (limits, transaction amounts) MUST be represented as integer minor units (e.g., cents) paired with an explicit ISO 4217 currency code — never as floating-point decimals. A limit or transaction amount without an explicit currency code is invalid.
- **Currency**: `[ASSUMPTION] single currency per card, fixed at creation time; changing a card's currency is not supported — reduces cross-currency limit-comparison ambiguity for this spec's scope.]` Decimal precision is fixed at 2 places (the ISO 4217 minor-unit exponent for the assumed USD/EUR-class currency); a limit or transaction amount with finer precision than 2 decimal places is invalid (FR-14).
- **ID conventions**: Card IDs, transaction IDs, and audit event IDs MUST be opaque, non-guessable, sortable-by-creation identifiers (e.g., ULID-style) — never the raw PAN, a sequential integer, or anything derived from PII. `[ASSUMPTION: exact ID scheme (ULID vs UUIDv7 vs other) is an implementation detail; the constraint that matters for the spec is opacity + non-PII-derivation.]`
- **Idempotency**: Card creation (FR-05), freeze (FR-12), unfreeze (FR-12), and limit-change (FR-13) each require their own caller-supplied idempotency key — freeze and unfreeze are tracked as two distinct idempotent actions, not a single shared key/toggle. Replaying the same key with the same payload MUST return the original result; replaying the same key with a *different* payload MUST be rejected as a conflict (see Edge Case E-10).
- **Concurrency**: Card state (status, limit) MUST be updated under optimistic concurrency control (e.g., a version/etag check) so that two concurrent writes (e.g., a freeze and a limit change racing) resolve deterministically — the losing writer MUST receive a conflict outcome and MUST be expected to retry against the latest state, not silently overwrite (see Edge Case E-09).
- **Stale reads**: Any read surface fed by an eventually-consistent upstream (transaction feed, propagated freeze/limit state to the authorization network) MUST be documented as such to the consumer — a card view response MUST NOT claim authorization-network-side effect has completed before the propagation window (§5) has elapsed.
- **Error semantics**: Errors MUST be typed/categorized (e.g., `INELIGIBLE`, `ALREADY_EXISTS`, `INVALID_LIMIT`, `CARD_CLOSED`, `CONFLICT`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`) rather than generic failures, so a caller (human or agent) can distinguish "retry safely" from "user must change input" from "not permitted." Error payloads MUST NOT include PAN, CVV, or other sensitive fields under any circumstance, including in stack-trace-style diagnostic detail.
- **Redaction**: Full PAN/CVV exist in-system only transiently, during the single creation hand-off (FR-03) and any transient in-memory step needed to pass them to the issuance provider's response processor; they MUST NOT appear in logs, audit events, error messages, or any persisted store beyond the issuance provider's own system of record. Masked PAN display format: `[ASSUMPTION] "•••• •••• •••• 1234"` (last 4 digits only, remaining digits replaced with a masking character).
- **Retention**: Card lifecycle/audit records follow NFR-05; the raw PAN/CVV retention (if any, beyond the creation hand-off) is the issuance provider's responsibility and explicitly out of scope here.
- **Authorization boundaries**: Every request path MUST enforce role/ownership checks server-side (not merely hide fields client-side) — an end-user request MUST be scoped to `account_id == session.account_id`; an ops/compliance request MUST be scoped to a verified internal role claim; FR-23 requires this be enforced as a hard boundary, not a UI omission.

## 7. Context for an AI Agent

### Beginning context (hypothetical)

- An account record already exists, with a boolean-derivable eligibility signal (KYC complete, good standing) — the mechanism producing this signal is out of scope.
- No card exists yet for this account (the `MO-01` creation flow assumes this as the common starting state; §8 covers the "already has one" case).
- Three external dependencies exist as **hypothetical** systems this feature integrates with, each described only by contract and failure behavior (never as a real API definition):
  - **Card issuance provider**: accepts a creation request (account ID, currency); returns, exactly once, a card reference plus full PAN/CVV plus masked PAN plus expiry. On timeout or provider-side failure, it returns a distinguishable "issuance failed, safe to retry" or "issuance failed, do not retry" outcome (`[ASSUMPTION]` — providers of this kind commonly distinguish transient vs. terminal failures so callers don't double-issue).
  - **Authorization network**: at purchase time, queries current card status and limit; this feature's only obligation is that the query sees post-propagation-window state (§5) and never sees full PAN beyond what the network itself already holds from issuance.
  - **Transaction feed**: delivers transaction records per card, **at-least-once** (`[ASSUMPTION]` — a common reliability contract for financial feeds, meaning the consuming side must deduplicate by transaction ID), with the consistency lag noted in §5.
- No audit trail yet exists for this card (it is created alongside the card itself, FR-04).

### Ending context (hypothetical)

- The account has exactly one card, in one of `ACTIVE`, `FROZEN`, or `CLOSED` status, with a current limit and currency.
- A complete, immutable audit trail exists for the card: creation, every freeze/unfreeze, every limit change, and every ops/compliance access to that trail (FR-22).
- The end-user can, at any time, retrieve current card state (masked) and paginated transaction history.
- Ops/compliance can, at any time, retrieve the full lifecycle/audit/access-decision history and any suspicious-pattern flags, with no path to full PAN/CVV.
- Any suspicious-pattern flags raised by the (hypothetical) fraud/risk system during the period are visible to ops/compliance, attached to the card.

## 8. Edge Cases and Failure Modes

| ID | Trigger | User-Visible Result | Audit / Compliance Consequence |
|----|---------|---------------------|---------------------------------|
| E-01 | End-user requests card creation while an `ACTIVE` or `FROZEN` card already exists on the account. | Rejected with a specific "you already have a card" outcome (not a generic error); existing card is unaffected. | No new `CARD_CREATED` event; no audit action needed since no state changed. |
| E-02 | End-user freezes a card that is already `FROZEN`. | Success, no-op — response reflects `FROZEN` status as if the action succeeded. | No new `CARD_FREEZE_CHANGED` event emitted (no actual state transition occurred) — `[ASSUMPTION]` avoids a misleading audit trail implying repeated state changes that didn't happen. |
| E-03 | End-user unfreezes a card that is already `ACTIVE`. | Success, no-op, symmetric to E-02. | Same as E-02: no spurious event. |
| E-04 | End-user attempts to freeze/unfreeze a `CLOSED` card. | Rejected with `CARD_CLOSED` error. | No event; `ACCESS_DECISION`-style rejection MAY be logged if ops later investigates repeated attempts (fraud-adjacent signal). |
| E-05 | End-user sets a limit outside policy floor/ceiling or in the wrong currency. | Rejected with `INVALID_LIMIT` and the specific reason (too high/too low/wrong currency). | No `CARD_LIMIT_CHANGED` event (rejected before persistence). |
| E-06 | End-user sets a limit lower than a currently pending (uncleared) authorization hold. | Accepted — the new limit takes effect for *future* authorizations; the pending hold is not retroactively invalidated. `[ASSUMPTION]` retroactively cancelling a pending hold is a network-side concern out of scope. | `CARD_LIMIT_CHANGED` event recorded normally; compliance can see the limit changed while a hold was outstanding, which is useful investigative context, not itself a violation. |
| E-07 | Two requests race: a freeze and a limit change on the same card at nearly the same time. | The second writer (by optimistic-concurrency version check) receives a `CONFLICT` and must retry against latest state; the first writer's change succeeds. | Only one audit event is written per actually-applied change; no duplicate or corrupted state. |
| E-08 | Authorization query arrives before a just-accepted limit change has propagated (within the assumed window, §5). | Authorization MAY be evaluated against the prior limit — documented as expected eventual-consistency behavior, not a bug. | `CARD_LIMIT_CHANGED` event timestamp lets compliance reconstruct that the authorization preceded propagation completion, if disputed later. |
| E-09 | Transaction feed delivers the same transaction twice (at-least-once delivery). | End-user sees the transaction once in their history (deduplicated by transaction ID). | No audit implication; internal dedup is a feed-consumption implementation detail. |
| E-10 | A creation, freeze/unfreeze, or limit-change request is retried with the same idempotency key but a different payload (e.g., different requested limit). | Rejected as a conflict — distinct from a same-payload replay, which returns the original result. | No new event for the conflicting retry; original event stands unmodified. |
| E-11 | A freeze/unfreeze or limit-change write partially completes (state persisted, audit event not yet durable) before a crash/timeout. | The read path (FR-06) MUST NOT reflect the new state until the write, including its audit event, is fully committed — end-user sees prior state until then, not an ambiguous or half-applied one. | Guarantees no state transition ever exists without a corresponding audit event — core to Principle IV. |
| E-12 | End-user requests transaction history with an expired or malformed pagination cursor. | Rejected with a specific "invalid page cursor, restart from first page" outcome, not a silent empty page. | No audit event needed; not a sensitive-data or state-changing action. |
| E-13 | Ops/compliance user without the correct internal role claim attempts to view a card's lifecycle/audit history. | Rejected with `FORBIDDEN`; no data returned. | An `ACCESS_DECISION` event MUST still be recorded for the denied attempt (Principle IV: audit the auditors, including failed/denied access attempts, which are themselves compliance-relevant signals). |
| E-14 | Fraud/risk system raises a suspicious-pattern flag while the card is mid-freeze-transition. | No effect on the end-user's freeze/unfreeze action; the flag is attached to the card record independently. | Flag and freeze-change event both appear in the card's history with independent timestamps — ops can correlate but the system does not auto-block on a flag within this spec's scope (auto-blocking is a fraud-response feature, out of scope here). |
| E-15 | Account underlying the card becomes ineligible (e.g., loses good standing) while the card is `ACTIVE`. | `[ASSUMPTION]` out of scope for this spec to define automatic card suspension on account-eligibility loss — noted here only as a boundary; a real system would need a separate account-lifecycle spec to define this trigger. | Flagged as a known gap rather than silently assumed away — see README follow-up note. |
| E-16 | Issuance provider times out or fails during card creation (FR-01–FR-04). | End-user sees a distinguishable "creation failed, please retry" (transient) vs. "creation failed, contact support" (terminal) outcome, per the provider's failure-type contract (§7). | No `CARD_CREATED` event on failure; if a retry with the same idempotency key later succeeds, only one event is ever recorded (FR-05). |
| E-17 | Empty state: end-user with no card views their card or transaction list. | Distinguishable "no card yet" / "no transactions yet" state, not an error (FR-08). | No audit event — this is a benign read of empty state. |
| E-18 | End-user freezes a card that has an existing pending (uncleared) authorization hold placed before the freeze. | The freeze succeeds and blocks *new* authorizations; the pre-existing pending hold is left standing and may still settle — not retroactively cancelled (FR-10). | `CARD_FREEZE_CHANGED` event recorded normally; compliance can see the freeze occurred while a hold was outstanding, useful investigative context, not itself a violation (symmetric to E-06). |
| E-19 | A previously `SETTLED` transaction is later reversed (merchant refund or network reversal). | End-user sees the original `SETTLED` entry unchanged plus a new, linked `REVERSED` entry referencing it — never a silent edit of the original (FR-24). | No special audit consequence beyond the transaction feed's own event; the original transaction record's immutability is preserved for later reconciliation. |
| E-20 | End-user's card exceeds the rate-limit threshold (>10 state-changing requests in a rolling 10-minute window). | Further requests receive `RATE_LIMITED` rather than being silently delayed, dropped, or queued (FR-25, NFR-09). | No new lifecycle audit event for the rate-limited attempt itself; sustained rate-limiting on a card is a `FREEZE_THRASHING`/`POST_FREEZE_AUTH_BURST`-adjacent signal ops MAY correlate with suspicious-pattern flags (FR-21). |

## 9. Verification Strategy

Per constitution Principle VII, every mid-level objective's verification approach is stated even though this is a document-only deliverable with no test suite produced.

### Documentation review (applies to all MOs)
- A reviewer re-reads this specification against `.specify/memory/constitution.md`'s seven principles and confirms every functional requirement (§4) traces to a mid-level objective (§2), and every mid-level objective has at least one linked task (§10) and one verification method below.

### Hypothetical unit-test coverage (documented, not implemented)
- **MO-01/FR-01–FR-05**: unit tests for eligibility-gate logic, duplicate-card rejection, idempotent-replay-returns-original, and the issuance-provider hand-off never persisting raw PAN/CVV beyond the masking step.
- **MO-02/FR-06–FR-08**: unit tests asserting the view response's field set matches FR-06 exactly, that full PAN/CVV never appear in the serialized response under any card status, and that the "no card yet" empty state (FR-08/E-17) is distinguishable from an error.
- **MO-03/FR-09–FR-12**: unit tests for every status-transition pair (`ACTIVE→FROZEN`, `FROZEN→ACTIVE`, no-op cases E-02/E-03, `CLOSED` rejection E-04).
- **MO-04/FR-13–FR-16**: unit tests for limit-validation boundary values (floor, ceiling, zero, negative, wrong currency, over-precision — E-05).
- **MO-05/FR-17–FR-19, FR-24**: unit tests for pagination cursor validity/ordering (E-12), transaction-ID-based dedup (E-09), and reversal entries linking to (not overwriting) the original record (E-19).
- **MO-06/FR-20–FR-23**: unit tests asserting no code path returns full PAN/CVV to the ops/compliance role (a negative test — the absence of a capability, not just a happy path).

### Hypothetical integration-test coverage (documented, not implemented)
- End-to-end card creation against a fake/stub issuance provider, including both transient-failure-retry-succeeds and terminal-failure paths (E-16).
- Freeze/unfreeze propagation to a stub authorization network, asserting the propagation window (§5) and E-08's documented eventual-consistency behavior.
- Concurrent freeze + limit-change race (E-07) against a stub optimistic-concurrency store, asserting exactly one write wins and exactly one audit event per applied change.
- Transaction feed consumption with duplicate delivery (E-09), asserting dedup.

### Hypothetical end-to-end (e2e) scenario coverage (documented, not implemented)
- Full lifecycle scenario: create → view → freeze → attempt authorization (blocked) → unfreeze → attempt authorization (allowed) → set limit → view transactions across a page boundary → ops/compliance reviews full history including the ops user's own `ACCESS_DECISION` event.
- Denied-access scenario: ops user without role claim attempts history view (E-13), confirming both the `FORBIDDEN` outcome and the resulting `ACCESS_DECISION` audit event.

### Fixtures
- Synthetic, clearly-fake card references and masked PANs (e.g., a documented test-only masking pattern) — the spec does not define real fixture data, only that fixtures MUST NOT use real or realistic PAN patterns, to avoid any ambiguity about real card data appearing in test artifacts.
- A fixed catalog of account eligibility states (eligible / KYC-incomplete / bad-standing) for exercising FR-01/FR-02/E-01.

### Reconciliation checks
- Periodic (`[ASSUMPTION] daily`) reconciliation comparing the count and sum of `CARD_LIMIT_CHANGED` events against the current limit value per card, confirming the current state is always derivable by replaying the audit trail — a concrete, checkable expression of Principle IV.
- Reconciliation between the transaction feed's reported transaction count per card and the count surfaced via paginated history, to catch silent pagination or dedup bugs.

### Manual compliance review checkpoints
- Before any change to limit floor/ceiling policy (§5) ships, a compliance reviewer signs off that the new bounds still satisfy applicable regulatory limits `[ASSUMPTION: exact regulatory regime unspecified — flagged as a required real-world lookup, not assumed here]`.
- Quarterly manual sampling of `ACCESS_DECISION` events to confirm ops/compliance access patterns look consistent with case-driven investigation rather than unexplained bulk browsing.

## 10. Low-Level Tasks

Every task lists its linked objective(s), dependencies, and acceptance criteria phrased as a checkable definition of done (Principle VII). Tasks are documentation/design-decomposition units, not code — "CREATE/UPDATE" language below refers to hypothetical system components being described, not files to be written in this assignment.

### Card Creation (MO-01, MO-07)

- **T-001** — Define the account eligibility signal contract.
  *Linked*: MO-01. *Depends on*: none.
  *Description*: Specify the exact boolean inputs (KYC-complete, good-standing, no-existing-active-card) that combine into the single eligibility signal consumed by FR-01.
  *Acceptance criteria*: [ ] All three input conditions are individually named; [ ] the combination rule (AND) is stated; [ ] a reviewer can determine eligibility for a hypothetical account from the stated inputs alone.

- **T-002** — Specify the duplicate-card rejection rule.
  *Linked*: MO-01. *Depends on*: T-001.
  *Description*: Define which existing card statuses block a new creation request (per E-01).
  *Acceptance criteria*: [ ] `ACTIVE` and `FROZEN` are explicitly listed as blocking; [ ] `CLOSED` is explicitly listed as non-blocking; [ ] the user-visible rejection outcome is distinct from a generic error.

- **T-003** — Specify the issuance-provider hand-off contract and failure taxonomy.
  *Linked*: MO-01. *Depends on*: none.
  *Description*: Document the request/response shape (in prose, not as an API) and the transient-vs-terminal failure distinction (E-16).
  *Acceptance criteria*: [ ] Request inputs (account ID, currency) are named; [ ] response includes card reference, masked PAN, expiry, and one-time full PAN/CVV hand-off; [ ] transient vs. terminal failure outcomes are each described with their expected caller behavior (retry vs. stop).

- **T-004** — Specify the idempotency-key behavior for creation.
  *Linked*: MO-01. *Depends on*: T-003.
  *Description*: Define same-key/same-payload vs. same-key/different-payload behavior (FR-05, E-10).
  *Acceptance criteria*: [ ] Same-key/same-payload returns original card, no duplicate; [ ] same-key/different-payload is rejected as conflict; [ ] behavior is stated as applying across a retry after a transient issuance failure (T-003).

- **T-005** — Specify the `CARD_CREATED` audit event schema (fields only, no storage engine).
  *Linked*: MO-01, MO-07. *Depends on*: T-001–T-004.
  *Description*: Enumerate the fields the event must carry (actor, account ID, card ID, initial status, timestamp).
  *Acceptance criteria*: [ ] All five fields are named; [ ] the event is stated as immutable once written; [ ] the event contains no PAN/CVV field.

### Card Viewing (MO-02)

- **T-006** — Specify the card view response's field set and masking rule.
  *Linked*: MO-02. *Depends on*: T-005.
  *Description*: Enumerate exactly which fields (status, masked PAN, expiry, currency, limit) are returned, and the masking format (last 4 digits only).
  *Acceptance criteria*: [ ] Field list matches FR-06 exactly; [ ] masking format is stated concretely; [ ] full PAN/CVV are explicitly listed as never-included fields.

- **T-007** — Specify the "no card exists" empty-state response.
  *Linked*: MO-02. *Depends on*: T-006.
  *Description*: Define the distinguishable empty state for FR-08/E-17.
  *Acceptance criteria*: [ ] Empty state is distinct from an error type; [ ] a reviewer can tell from the spec alone how a caller would branch on "no card yet" vs. "card exists."

### Freeze / Unfreeze (MO-03, MO-07)

- **T-008** — Specify the status state machine (`ACTIVE` ↔ `FROZEN`, both → `CLOSED`).
  *Linked*: MO-03. *Depends on*: T-005.
  *Description*: Enumerate valid and invalid transitions, including the `CLOSED` terminal state's rejection of further freeze/unfreeze (E-04).
  *Acceptance criteria*: [ ] All valid transitions are listed; [ ] `CLOSED` is marked terminal for freeze/unfreeze; [ ] no-op behavior for repeated same-state requests (E-02/E-03) is stated.

- **T-009** — Specify the freeze-to-authorization-blocking propagation contract.
  *Linked*: MO-03. *Depends on*: T-008, external authorization-network contract (§7).
  *Description*: Define how `FROZEN` status is expected to be visible to the authorization network query and within what window (§5).
  *Acceptance criteria*: [ ] Propagation window target is stated with its `[ASSUMPTION]` label; [ ] the pre-propagation-window behavior (E-08-analogous) is acknowledged rather than left undefined.

- **T-010** — Specify the `CARD_FREEZE_CHANGED` audit event schema.
  *Linked*: MO-03, MO-07. *Depends on*: T-008.
  *Description*: Enumerate fields (actor, card ID, prior status, new status, timestamp) and confirm no-op transitions do not emit an event (E-02/E-03).
  *Acceptance criteria*: [ ] All fields named; [ ] no-op non-emission rule stated explicitly; [ ] immutability restated.

### Spending Limit (MO-04, MO-07)

- **T-011** — Specify policy floor/ceiling values and their currency scoping.
  *Linked*: MO-04. *Depends on*: none.
  *Description*: State the assumed floor/ceiling (1,000–1,000,000 minor units, 2-decimal currency, per Clarifications 2026-07-15) and that they apply per the card's fixed currency.
  *Acceptance criteria*: [ ] Floor and ceiling are each stated concretely with an `[ASSUMPTION]` tag (§5); [ ] currency-mismatch rejection (E-05) is cross-referenced; [ ] decimal-precision rule (2 places) is cross-referenced (§6).

- **T-012** — Specify limit-validation rules and rejection reasons.
  *Linked*: MO-04. *Depends on*: T-011.
  *Description*: Enumerate each invalid-input case (negative, zero, non-finite, wrong currency, out-of-bounds) and its distinct rejection reason.
  *Acceptance criteria*: [ ] Each of the 5 invalid cases has a named rejection reason; [ ] E-05 and E-06 are both addressed (rejection vs. accepted-but-doesn't-retroactively-apply).

- **T-013** — Specify the `CARD_LIMIT_CHANGED` audit event schema.
  *Linked*: MO-04, MO-07. *Depends on*: T-012.
  *Description*: Enumerate fields (actor, card ID, prior limit, new limit, currency, timestamp).
  *Acceptance criteria*: [ ] All fields named; [ ] event is stated as always emitted on any accepted change, including E-06's edge case.

- **T-014** — Specify the optimistic-concurrency conflict rule for competing freeze/limit writes.
  *Linked*: MO-03, MO-04. *Depends on*: T-010, T-013.
  *Description*: Define the version/etag check and the losing-writer conflict outcome (E-07).
  *Acceptance criteria*: [ ] Conflict outcome is distinguishable from validation-error outcomes; [ ] exactly-one-event-per-applied-change guarantee is stated.

### Transaction Viewing (MO-05)

- **T-015** — Specify the transaction feed consumption contract (delivery guarantee, dedup key).
  *Linked*: MO-05. *Depends on*: §7 feed contract.
  *Description*: State at-least-once delivery and transaction-ID-based dedup (E-09).
  *Acceptance criteria*: [ ] Delivery guarantee named; [ ] dedup key named; [ ] consistency lag target cross-referenced from §5.

- **T-016** — Specify pagination contract (page size, cursor semantics, invalid-cursor handling).
  *Linked*: MO-05. *Depends on*: T-015.
  *Description*: Define default/max page size, ordering (most-recent-first), and invalid/expired cursor behavior (E-12).
  *Acceptance criteria*: [ ] Default and max page size stated with `[ASSUMPTION]` label; [ ] ordering stated; [ ] invalid-cursor outcome distinguishable from empty-page.

- **T-017** — Specify the transaction record field set and PAN-exclusion rule.
  *Linked*: MO-05. *Depends on*: T-016.
  *Description*: Enumerate fields (amount + currency, merchant descriptor, timestamp, status) and confirm full PAN exclusion (FR-18).
  *Acceptance criteria*: [ ] All fields named; [ ] full PAN explicitly listed as excluded; [ ] amount format matches §6 money-format rule (minor units + currency code).

- **T-028** — Specify the reversed-transaction linking contract.
  *Linked*: MO-05. *Depends on*: T-017.
  *Description*: Define how a `REVERSED` entry references its original `SETTLED` transaction ID without editing or deleting the original record (FR-24, E-19).
  *Acceptance criteria*: [ ] `REVERSED` entry's link field to the original transaction ID is named; [ ] original-record immutability is stated explicitly; [ ] the end-user-visible pairing (original + reversal shown as two entries) is described.

### Ops/Compliance Visibility (MO-06, MO-07)

- **T-018** — Specify the ops/compliance lifecycle-history query contract (by card ID or account ID).
  *Linked*: MO-06. *Depends on*: T-005, T-010, T-013.
  *Description*: Define the combined, chronologically-ordered view of creation/freeze/limit events for a given card.
  *Acceptance criteria*: [ ] Both lookup keys (card ID, account ID) are supported; [ ] ordering is chronological; [ ] response is confirmed to exclude PAN/CVV fields (none exist in the underlying events per T-005/T-010/T-013).

- **T-019** — Specify the suspicious-pattern-flag visibility contract.
  *Linked*: MO-06. *Depends on*: §7 fraud/risk system.
  *Description*: Define what a flag record contains (reason code, timestamp) as visible to ops/compliance (FR-21).
  *Acceptance criteria*: [ ] Flag fields named; [ ] flag is stated as independent of (not blocking) concurrent freeze/limit actions (E-14).

- **T-020** — Specify the `ACCESS_DECISION` audit event, covering both granted and denied ops/compliance reads.
  *Linked*: MO-06, MO-07. *Depends on*: T-018.
  *Description*: Define the event emitted on every ops/compliance read attempt, success or `FORBIDDEN` (E-13).
  *Acceptance criteria*: [ ] Event fields include actor, target card ID, outcome (granted/denied), timestamp; [ ] denied attempts are explicitly confirmed to also emit this event, not just successful ones.

- **T-021** — Specify the hard authorization-boundary rule preventing any ops/compliance code path from reaching full PAN/CVV.
  *Linked*: MO-06. *Depends on*: T-018.
  *Description*: State that this is enforced as an absence-of-capability at the data-access layer, not a UI-level redaction (FR-23).
  *Acceptance criteria*: [ ] Rule is stated as a server-side/data-layer boundary, not display-only; [ ] a reviewer can confirm no field, endpoint, or export path in §4/§6 exposes full PAN/CVV to this role.

### Cross-Cutting: Audit, Concurrency, Error Semantics

- **T-022** — Specify the global error-code taxonomy referenced across FR-02, FR-05, FR-08, FR-09, FR-12, FR-14, FR-25.
  *Linked*: MO-01, MO-03, MO-04, MO-05. *Depends on*: T-002, T-004, T-007, T-008, T-012, T-029.
  *Description*: Consolidate the named error types (`INELIGIBLE`, `ALREADY_EXISTS`, `INVALID_LIMIT`, `CARD_CLOSED`, `CONFLICT`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`) into one reference list with the flows that raise each.
  *Acceptance criteria*: [ ] Every error type used in §4/§8 appears in this list; [ ] each entry cross-references at least one FR or edge case; [ ] no PAN/CVV appears in any example error content.

- **T-023** — Specify the write-then-audit atomicity guarantee (E-11).
  *Linked*: MO-03, MO-04, MO-07. *Depends on*: T-010, T-013.
  *Description*: State that a state transition and its audit event are treated as a single committed unit from the read path's perspective.
  *Acceptance criteria*: [ ] Rule explicitly forbids a read reflecting a state change whose audit event is not yet durable; [ ] cross-referenced to NFR-08.

- **T-024** — Specify the reconciliation job's inputs/outputs (audit-trail-to-current-state replay check).
  *Linked*: MO-04, MO-07. *Depends on*: T-013, T-023.
  *Description*: Define what the reconciliation check in §9 compares and what a mismatch would indicate.
  *Acceptance criteria*: [ ] Inputs (event stream) and output (pass/fail per card) are named; [ ] a mismatch is stated as indicating a Principle IV violation worth investigating, not an expected occurrence.

- **T-029** — Specify the state-changing-request rate-limit contract.
  *Linked*: MO-03, MO-04. *Depends on*: T-014.
  *Description*: Define the per-card rolling-window request count, the `RATE_LIMITED` rejection outcome, and its relationship to the `FREEZE_THRASHING` suspicious-pattern signal (FR-25, NFR-09, E-20).
  *Acceptance criteria*: [ ] Window size and request threshold are named with their `[ASSUMPTION]` tag; [ ] rejection is stated as explicit, not silent delay/drop; [ ] relationship to the lower-threshold `FREEZE_THRASHING` signal (FR-21) is stated so the two aren't confused as the same mechanism.

### Verification Setup

- **T-025** — Define the synthetic fixture catalog for eligibility states and masked-PAN patterns.
  *Linked*: MO-01, MO-02. *Depends on*: T-001, T-006.
  *Description*: Specify the fixture set referenced in §9 (Fixtures).
  *Acceptance criteria*: [ ] At least 3 eligibility fixture states named (eligible / KYC-incomplete / bad-standing); [ ] fixture PAN patterns are explicitly stated as non-realistic/clearly-fake.

- **T-026** — Define the end-to-end lifecycle verification scenario script (documentation only).
  *Linked*: MO-01–MO-07. *Depends on*: T-001–T-024.
  *Description*: Write out, as documentation, the full scenario listed in §9 (create → view → freeze → blocked auth → unfreeze → allowed auth → limit change → paginated transactions → ops review).
  *Acceptance criteria*: [ ] Scenario touches every MO at least once; [ ] each step names the FR(s) it exercises; [ ] the ops-review step explicitly includes verifying the reviewing ops user's own `ACCESS_DECISION` event appears afterward.

- **T-027** — Define the denied-access verification scenario (E-13).
  *Linked*: MO-06, MO-07. *Depends on*: T-020.
  *Description*: Write out, as documentation, the ops-user-without-role-claim scenario and its expected dual outcome (rejection + audit event).
  *Acceptance criteria*: [ ] Both the `FORBIDDEN` response and the `ACCESS_DECISION` (denied) event are named as required outcomes; [ ] scenario states this is a required test, not optional coverage.

## Traceability Matrix

Consolidated view of §2's objectives against §4's requirements, §9's verification activities, and §10's low-level tasks (Principle I: Requirement Traceability). No row is empty; no FR or task is orphaned.

| MO | Functional Requirements | Verification Activities (§9) | Low-Level Tasks (§10) |
|---|---|---|---|
| **MO-01** Card creation | FR-01, FR-02, FR-03, FR-04, FR-05 | Unit: eligibility/duplicate/idempotency/PAN-handling; Integration: stub-issuance-provider creation incl. transient/terminal failure; E2E: full lifecycle scenario | T-001, T-002, T-003, T-004, T-005, T-025, T-026 |
| **MO-02** Card viewing | FR-06, FR-07, FR-08 | Unit: field-set/masking/empty-state assertions; Doc review | T-006, T-007 |
| **MO-03** Freeze/unfreeze | FR-09, FR-10, FR-11, FR-12, FR-12a, FR-25 (rate limit) | Unit: transition-pair coverage; Integration: freeze propagation to stub auth network; E2E: full lifecycle scenario | T-008, T-009, T-010, T-014, T-023, T-029 |
| **MO-04** Spending limit | FR-13, FR-14, FR-15, FR-16, FR-25 (rate limit) | Unit: limit-validation boundaries; Integration: concurrent freeze+limit race; Reconciliation: daily limit-vs-audit-trail replay | T-011, T-012, T-013, T-014, T-024, T-029 |
| **MO-05** Transaction viewing | FR-17, FR-18, FR-19, FR-24 | Unit: pagination/dedup/reversal-linking; Integration: duplicate-delivery dedup; Reconciliation: feed-count-vs-paginated-count | T-015, T-016, T-017, T-028 |
| **MO-06** Ops/compliance visibility | FR-20, FR-21, FR-22, FR-23 | Unit: no-PAN-path negative test; E2E: denied-access scenario; Manual: quarterly `ACCESS_DECISION` sampling | T-018, T-019, T-020, T-021, T-027 |
| **MO-07** Audit trail integrity | FR-04, FR-11, FR-15, FR-22 (audit emission); NFR-04 | Reconciliation: audit-trail replay check; write-then-audit atomicity (E-11) | T-005, T-010, T-013, T-020, T-023, T-024 |

## 11. Definition of Done for the Document Deliverables

This section defines when the four required deliverables (per `TASKS.md`) are considered complete — a Definition of Done for the *documents themselves*, distinct from the hypothetical system's own acceptance criteria in §10.

- [ ] `specification.md` (this file) — every MO has ≥1 FR and ≥1 task referencing it; every FR cites an MO; every numeric NFR/performance target is labeled `[ASSUMPTION]` with a stated rationale; the edge-case table covers at least the failure modes named in the assignment brief (empty states, partial failures, concurrency, invalid limits, stale data, permission boundaries, fraud-adjacent patterns); §10 tasks each carry checkable acceptance criteria.
- [ ] `agents.md` — states tech-stack assumptions (explicitly labeled, since none are mandated), domain rules (banking/FinTech), code style expectations, testing/verification expectations, security/compliance constraints, and explicit edge-case handling guidance (e.g., never log PAN, prefer idempotent writes) consistent with this spec's §4/§6/§8.
- [ ] `.claude/rules/fintech-specification.md` — steers AI-assisted work with naming/pattern guidance and FinTech-sensitive defaults that do not contradict this spec's Implementation Notes (§6) or constitution.
- [ ] `README.md` — states student/task summary, rationale for how performance targets (§5) and verification depth (§9) were chosen, and cites which best practices appear where (file/section references) in the other three deliverables.
- [ ] All four deliverables use the same `[ASSUMPTION]` marker convention (Principle: Assumption Labeling Discipline, `.specify/memory/constitution.md`) and do not contradict one another on redaction, retention, or permission rules.

---

**Traceability check (Principle I)**: Every FR-* above cites an MO-*; every MO-* has at least one FR and one T-* referencing it; every edge case in §8 (including E-18–E-20, added during clarification) either maps to a named FR/error path or is explicitly flagged as an out-of-scope gap (E-15). Every numeric target in §5 is labeled `[ASSUMPTION]` with a stated rationale, per the constitution's Assumption Labeling Discipline. All ambiguities raised in the 2026-07-15 clarification pass are resolved and integrated above — none remain open. As of the 2026-07-15 analysis pass: 26 functional requirements (FR-01–FR-25, incl. FR-12a), 9 NFRs, 20 edge cases (E-01–E-20), 29 low-level tasks (T-001–T-029, incl. T-028/T-029 added this pass to close FR-24/FR-25 task-coverage gaps) — no FR or edge case lacks a task, and the error-code taxonomy (T-022) now includes `RATE_LIMITED`.
