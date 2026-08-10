# Homework 6 initial structure design

**Date:** 2026-08-09
**Status:** agreed in dialogue, waiting for review of recorded document
**Student:** ilia makarov

## 1. Purpose

Create a clear documentation foundation and initial Claude Code infrastructure for Homework 6 by clearly separating two different meanings of the word "agent": AI meta-agents that help develop the project, and TypeScript pipeline agents that perform deterministic banking logic.

This stage does not implement the TypeScript pipeline. It fixes the rules, structure, responsibilities and reproducible AI-workflows, on the basis of which the pipeline will be designed and implemented in the following stages.

## 2. Documentation style

Project documentation uses clear B1+ English. AI tools keep one canonical version of each document and do not create language duplicates.

## 3. Two levels of agents

### 3.1. AI meta-agents

AI meta-agents work inside Claude Code and create project artifacts:

1. `hw6-specification-agent` creates and updates the technical specification.
2. `hw6-code-generation-agent` implements the TypeScript pipeline and documents the use of Context7.
3. `hw6-unit-test-agent` creates unit and integration tests and monitors coverage.
4. `hw6-documentation-agent` supports README, HOWTORUN and other documentation.

Meta-agents do not process banking transactions while the application is running. Their responsibility is development, testing, documentation and automation.

### 3.2. TypeScript pipeline agents

Pipeline agents are regular TypeScript modules without LLM or other AI:

1. `transaction-validator` checks the transaction structure, amount and ISO 4217 currency code.
2. `fraud-detector` determines the risk score by amount, time and cross-border features.
3. `compliance-checker` performs the final check and generates the result.

`integrator.ts` sequentially calls these modules and organizes JSON communication through the `shared/` directories. Claude Code runs the pipeline with a single command, but does not replace its business logic.

## 4. Canonical structure of documentation

```text
homework-6/
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── CODEX.md
├── GEMINI.md
├── HOWTORUN.md
├── TASKS.md
│
└── docs/
    ├── specification.md
    ├── research-notes.md
    ├── log.md
    ├── decisions/
    ├── screenshots/
    └── superpowers/
        ├── specs/
        └── plans/
```

By direct decision of the student, the canonical specification is stored in `docs/specification.md`, the Context7 usage notes in `docs/research-notes.md`, and the changelog in `docs/log.md`. Root duplicates of these files are not created. `AGENTS.md` should explicitly define these paths for Claude Code, Codex, and Gemini.

`CLARIFY.md` is a student's temporary personal explanation, not canonical project documentation. Its useful explanations and diagrams are transferred to `README.md`, after which the file is deleted so as not to support two sources of the same information.

`docs/superpowers/specs/` contains agreed design documents and `docs/superpowers/plans/` contains step-by-step implementation plans. `docs/decisions/` is used only for individual architectural solutions that require independent justification. The wiki is not initially created.

## 5. Main AI instructions

`AGENTS.md` is the only canonical source of rules for AI tools. It should require:

- read `TASKS.md`, `README.md` and `docs/specification.md` before work, if it already exists;
- always specify which level of agents we are talking about: AI meta-agent or TypeScript pipeline agent;
- do not create `specification.md`, `research-notes.md` or `log.md` in the root;
- after each material change, add an append-only record to `docs/log.md`;
- use Context7 for up-to-date documentation of libraries and frameworks;
- do not log PII;
- use the exact decimal type for money, not JavaScript `number`;
- write code through tests and check the result before declaring completion;
- never perform `git commit`: the student independently reviews and commits changes;
- after completing the verified stage, offer the student a short conventional commit name;
- keep project documentation clear, consistent, and in B1+ English.

`CLAUDE.md`, `CODEX.md` and `GEMINI.md` remain short pointer files. Each of them obligates the corresponding tool to first read `AGENTS.md` and does not duplicate the underlying rules.

### 5.1. Git policy

AI tools can look at git status and diff to check their own changes, but should not create commits. After the changes are verified, the AI ​​suggests a commit name in the Conventional Commits format. The student independently conducts the final review, adds the necessary files to the staging area and commits.

## 6. Claude Code infrastructure

```text
.claude/
├── agents/
│   ├── hw6-specification-agent.md
│   ├── hw6-code-generation-agent.md
│   ├── hw6-unit-test-agent.md
│   └── hw6-documentation-agent.md
├── commands/
│   ├── write-spec.md
│   ├── run-pipeline.md
│   └── validate-transactions.md
├── hooks/
│   └── coverage-gate.sh
└── settings.json
```

Commands are custom entry points, and meta-agent definitions contain specialized roles and restrictions. `write-spec` delegates the work of the specification agent; `run-pipeline` runs the full TypeScript pipeline and shows a summary; `validate-transactions` starts the validator in dry-run mode.

A coverage hook triggers a test coverage check before a push is allowed or the corresponding Claude Code action. The blocking threshold is below 80%, the project goal is at least 90%.

## 7. Technological direction

Main application stack:

| Part | Technology |
|---|---|
| Runtime | Node.js LTS |
| Language | TypeScript in strict mode |
| Framework | Fastify |
| File protocol | JSON in `shared/` |
| Database as needed | SQLite |
| ORM as needed | Drizzle ORM |
| Tests TypeScript test runner with coverage gate |
| MCP | TypeScript MCP server |

Fastify is used as a framework for the network/API layer and the integration server if they are required by the implementation. The main transaction pipeline remains a CLI workflow and does not depend on HTTP for transaction processing.

SQLite with Drizzle is added only when there is a specific need for long-term history or metadata storage. The database does not replace the mandatory JSON file protocol and results in `shared/results/`.

## 8. Log of changes

`docs/log.md` is a chronological append-only log of what happened in the project and when. New entries are always added to the end of the file; existing records are not overwritten except to correct the actual error.

Each entry begins with a stable machine-readable prefix:

```text
## [YYYY-MM-DD] <type> | <short name>
```

Valid seed types are `design`, `docs`, `research`, `implement`, `test`, `fix`, `refactor`, `lint`, and `verify`. The list can be expanded if necessary, but the type names should be kept short and consistent.

Recording format:

```markdown
## [2026-08-09] design | The initial structure of Homework 6

- Author/tool: <name or AI tool>
- Changes: <what is done>
- Files: <list of files>
- Validation: <commands or validation method>
```

Thanks to the stable header, recent entries can be retrieved with simple Unix commands, for example:

```bash
grep "^## \[" docs/log.md | tail -5
```

The log gives the AI tools a brief timeline of the project's development and helps them understand what has been done recently before starting work.

## 9. README

The README must use simple B1+ English and contain:

- student `ilia makarov`;
- a brief description of the purpose of the project;
- a separate section on two levels of agents;
- responsibility of four AI meta-agents;
- responsibility of TypeScript pipeline agents;
- adapted explanations and three diagrams from `CLARIFY.md`: general Claude Code workflow, TypeScript pipeline sequence, and Claude Code interaction with MCP;
- a separate ASCII pipeline flow diagram, which is directly required by Homework 6;
- technological stack;
- explanation of the role of Fastify and conditional use of SQLite/Drizzle;
- links to `docs/specification.md`, `docs/research-notes.md`, `docs/log.md` and the upcoming HOWTORUN.

The README should not claim that not yet implemented components are already working. Planned components are explicitly marked as planned.

`AGENTS.md` does not duplicate tutorials from the README. It contains only the operational rules, canonical paths, terminology, and constraints needed by AI tools at runtime.

## 10. Inspection of the initial stage

After creating the documentation foundation, you need to check:

1. All wrapper files direct AI to `AGENTS.md`.
2. `AGENTS.md` uses the canonical paths `docs/specification.md`, `docs/research-notes.md`, and `docs/log.md`.
3. The README consistently distinguishes two levels of agents.
4. Claude Code scaffold contains four meta-agent definitions and three commands.
5. The documentation does not declare the readiness of the TypeScript pipeline.
6. `docs/log.md` contains a record of created files.
7. There are no unfilled placeholders or conflicting paths in the documents.
8. AI did not create a git commit and suggested a commit name for the completed stage.
9. The useful content of `CLARIFY.md` has been moved to the README, after which the temporary file has been removed.
