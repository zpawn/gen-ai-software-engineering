# LLM Wiki Schema (AGENTS)

This is the primary schema file for the LLM-managed Wiki. The wiki files are located in the `homework-1/wiki/` directory.

## Architecture
- **`homework-1/wiki/raw/`**: Immutable source files. Do not modify these.
- **`homework-1/wiki/index.md`**: The central catalog. Must be updated whenever new pages are created.
- **`homework-1/wiki/log.md`**: A chronological append-only log of changes. Must be updated upon each ingestion or lint pass.
- **Other `.md` files in `homework-1/wiki/`**: Synthesized wiki pages.

## Core Operations

1. **Ingest**:
   - Read the provided source document from `homework-1/wiki/raw/`.
   - Extract key themes, entities, and concepts.
   - Create new wiki pages (e.g. `homework-1/wiki/architecture.md`, `homework-1/wiki/setup.md`) or update existing ones.
   - Update `homework-1/wiki/index.md` to catalog the new/updated pages.
   - Append an entry to `homework-1/wiki/log.md` in the format `## [YYYY-MM-DD] ingest | <Source Name>`.

2. **Query**:
   - Read `homework-1/wiki/index.md` to discover relevant pages.
   - Retrieve and synthesize the information to answer the user's question.
   - If the synthesis is valuable, save it as a new wiki page in `homework-1/wiki/` and update the index/log.

3. **Lint**:
   - Check for contradictions, stale claims, or orphan pages in `homework-1/wiki/`.
   - Suggest updates or perform automatic cleanup.

## Agent-Specific Instructions
Depending on which LLM you are using, consult the appropriate sub-schema for specific capabilities and workflows:

- [Gemini / Antigravity Instructions](./GEMINI.md)
- [Claude Instructions](./CLAUDE.md)
- [Codex Instructions](./CODEX.md)
