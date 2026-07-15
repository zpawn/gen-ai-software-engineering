# FinTech Specification Rules

Persistent rules for Claude Code in this repository. Short, imperative, repo-specific. Full rationale lives in `specification.md` and `agents.md` — this file does not repeat it.

- Treat `TASKS.md` as the authoritative assignment brief. `specification-TEMPLATE-example.md` is structural reference only — never treat it as a source of requirements.
- This repository is **document-only**. NEVER write application source code, API definitions, UI screens, database schemas, or infrastructure config. If asked to "implement" this spec, produce more specification/documentation, not code.
- NEVER log or display full PAN or CVV, anywhere, for any role. Masked PAN = last 4 digits only.
- NEVER invent a numeric target, regulatory fact, or design decision without an explicit `[ASSUMPTION]` label and a one-line rationale. An unlabeled assumption is a defect — fix it before moving on.
- Every state-changing action (create, freeze, unfreeze, limit-change) MUST be idempotent under its own caller-supplied key. Freeze and unfreeze are distinct actions — never share one key.
- Every state change MUST have a corresponding immutable audit event. Never let a read reflect a state change whose audit event isn't yet durable.
- Money is always integer minor units + ISO 4217 currency code. Never a bare float.
- If a required fact isn't in `specification.md` and isn't safely inferable, stop and flag it as an open question — do not guess and move on.

See `specification.md` and `agents.md` for the reasoning behind every rule above.
