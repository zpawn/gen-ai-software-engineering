# Main Instructions for AI Tools

`AGENTS.md` is the canonical source of rules for Claude Code, Codex, Gemini, and other AI tools working on Homework 6.

## Required Reading Order

Before any work:

1. Read `AGENTS.md` completely.
2. Read `TASKS.md` as the original source of requirements.
3. Read `README.md` to understand the two agent levels and current status.
4. Read `docs/specification.md` if it exists.
5. Review recent entries with `grep "^## \[" docs/log.md | tail -5` if `docs/log.md` exists.
6. For an implementation task, read the approved design in `docs/superpowers/specs/` and the plan in `docs/superpowers/plans/`.

Do not claim that a component is implemented or verified until files and fresh command output prove it.

## Canonical Documentation Paths

- Technical specification: `docs/specification.md`.
- Feature specifications: `docs/specifications/<feature-slug>.md`.
- Context7 research notes: `docs/research-notes.md`.
- Append-only change log: `docs/log.md`.
- Approved Superpowers designs: `docs/superpowers/specs/`.
- Superpowers implementation plans: `docs/superpowers/plans/`.
- Separate ADRs when needed: `docs/decisions/`.
- Submission screenshots: `docs/screenshots/`.

Do not create root-level copies of `specification.md`, `research-notes.md`, or `log.md`.

Before implementing a new feature, create a feature spec with the project skill `hw6-writing-feature-specifications` in `.claude/skills/hw6-writing-feature-specifications/`. The skill uses a bundled asset adapted from `homework-3/specification-TEMPLATE-example.md`. The general `docs/specification.md` remains project-level context and is not overwritten by the feature workflow.

## Required Terms: Two Agent Levels

The word “agent” is unclear without a level. Always use one of these names:

### AI meta-agent

A Claude Code workflow that helps build the project:

- `hw6-specification-agent` — specification;
- `hw6-code-generation-agent` — TypeScript implementation and Context7 research;
- `hw6-unit-test-agent` — tests and coverage;
- `hw6-documentation-agent` — README, HOWTORUN, and other documentation.

### TypeScript pipeline agent

A deterministic runtime module without an LLM:

- `transaction-validator`;
- `fraud-detector`;
- `compliance-checker`.

AI meta-agents build and verify the system. TypeScript pipeline agents process transactions. Claude Code can run the pipeline, but it does not replace business logic.

## Documentation Language

Write all project documentation in B1+ English. File names, API names, identifiers, library names, and standard technical terms remain in English.

## Planned Technology Stack

- Runtime: Node.js LTS.
- Language: TypeScript in strict mode.
- Framework: Fastify.
- File protocol: JSON in `shared/`.
- Money: a precise decimal library; never use JavaScript `number` for monetary arithmetic.
- Database only when clearly needed: SQLite.
- ORM only with a database: Drizzle ORM.
- MCP server: TypeScript.
- Tests: a TypeScript test runner with a coverage target of at least 90% and a blocking gate below 80%.

Use Fastify only for a network/API or integration layer when needed. The CLI transaction pipeline must not depend on HTTP. SQLite/Drizzle do not replace the required JSON files in `shared/`.

## Runtime Protocol

The integrator must:

1. Create `shared/input`, `shared/processing`, `shared/output`, and `shared/results`.
2. Load all records from `sample-transactions.json`.
3. Wrap each transaction in the standard JSON message envelope.
4. Pass it in sequence through the validator, fraud detector, and compliance checker.
5. Write a final outcome for every input transaction to `shared/results/`, including rejected transactions.
6. Create a pipeline summary report.

For one transaction, pipeline stages run in sequence. Asynchronous file operations are allowed, but they must not break the dependency on the previous stage result.

## Data, Money, and Security

- Amount arrives as a decimal string and is processed with a precise decimal type.
- Currency is checked against supported ISO 4217 codes.
- Timestamp uses ISO 8601 UTC.
- An audit entry includes timestamp, agent name, transaction ID, and outcome.
- Do not log account numbers, names, or other PII in plain text; use masking or redaction.
- A rejected result always contains a machine-readable status and a clear reason.
- Do not add an external database, queue, Docker, or cloud service without a requirement that cannot be met more simply.

## Library Documentation

For any framework, library, SDK, API, or CLI work, use Context7 before implementation, even when the API seems familiar.

Order:

1. Resolve the exact Context7 library ID.
2. Query documentation for one specific concept at a time.
3. Apply the returned pattern.
4. Add the search text, library ID, insight, and actual use to `docs/research-notes.md`.

The code-generation meta-agent must add at least two Context7 queries during pipeline implementation.

## Development Process

- Use relevant Superpowers skills before creative or implementation work.
- Before implementation, create or update an approved design and implementation plan.
- For a feature or bugfix, use TDD: failing test → minimal implementation → passing test → refactor.
- Isolate tests from real `shared/` by using a temporary directory.
- Before completion, run full relevant verification and read its output.
- Do not change unrelated user files or run destructive Git operations.

## Change Log

`docs/log.md` is a chronological append-only record. After each material change, add an entry at the end:

```markdown
## [YYYY-MM-DD] <type> | <short title>

- Author/tool: <name or AI tool>
- Changes: <changes actually made>
- Files: <files actually changed>
- Verification: <commands actually run or manual check>
```

Main types: `design`, `docs`, `research`, `implement`, `test`, `fix`, `refactor`, `lint`, `verify`.

Do not rewrite or sort older entries. Do not add verification that did not happen.

## Git Policy

- Never run `git commit`.
- Do not run `git add` unless the student directly asks.
- You may use read-only `git status`, `git diff`, and `git log` for verification.
- After a completed and verified stage, suggest a short Conventional Commit title.
- The student reviews, stages, and commits changes independently.
