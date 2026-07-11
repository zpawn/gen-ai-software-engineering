# AI Tools Architecture

This page adapts the LLM-managed wiki approach from `homework-1` for `homework-2`.

## Knowledge Base Structure

```text
homework-2/
└── wiki/
    ├── raw/                 # Immutable source documents copied from the assignment
    ├── index.md             # Central catalog of wiki pages
    ├── log.md               # Chronological append-only change log
    ├── architecture.md      # Synthesized technical architecture
    ├── tickets.md           # Core domain entity
    └── frontend.md          # Next.js frontend placeholder
```

## Source Rules

- Files in `wiki/raw/` are treated as immutable assignment sources.
- Synthesized pages live directly under `wiki/`.
- `index.md` must be updated whenever a new wiki page is created.
- `log.md` must receive a dated entry for every ingestion or meaningful documentation update.

## Core Operations

### Ingest
- Read the relevant source document from `homework-2/wiki/raw/`.
- Extract domain entities, API requirements, validation rules, workflows, and documentation requirements.
- Create or update synthesized wiki pages.
- Update `index.md` and append to `log.md`.

### Query
- Start from `wiki/index.md`.
- Read only the pages relevant to the question.
- If the answer produces reusable project knowledge, save it as a synthesized wiki page and update the catalog/log.

### Lint
- Check for contradictions between raw assignment files and synthesized wiki pages.
- Detect stale claims, missing pages, and orphan pages.
- Keep raw sources unchanged.

## AI Collaboration Policy

- Use the wiki as the shared project memory before generating code or documentation.
- Keep implementation-specific decisions traceable to either the assignment source or a wiki page.
- For this homework, documentation must account for both backend REST API work and a future Next.js frontend.
- Backend architecture should follow the same module-oriented MVC approach used in `homework-1`, adapted to support tickets, imports, classification, tests, and documentation deliverables.
- Frontend details remain intentionally skeletal until the next planning step.
