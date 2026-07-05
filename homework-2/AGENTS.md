# LLM Wiki Schema (AGENTS)

This is the primary schema file for the LLM-managed Wiki in `homework-2`.
The wiki files are located in the `homework-2/wiki/` directory.

## Project Context

`homework-2` is an intelligent customer support system. The planned work includes:

- A REST API for ticket CRUD, bulk import, filtering, and auto-classification.
- Backend architecture based on the same module-oriented MVC approach used in `homework-1`.
- A future Next.js frontend that consumes the REST API.
- Tests, sample data, and multi-level documentation required by the assignment.

## Architecture

- **`homework-2/wiki/raw/`**: Immutable source files copied from assignment or project inputs. Do not modify these during synthesis.
- **`homework-2/wiki/index.md`**: The central catalog. Must be updated whenever new pages are created.
- **`homework-2/wiki/log.md`**: A chronological append-only log of changes. Must be updated upon each ingestion, synthesis, or lint pass.
- **Other `.md` files in `homework-2/wiki/`**: Synthesized wiki pages.

## Core Operations

1. **Ingest**:
   - Read the provided source document from `homework-2/wiki/raw/`.
   - Extract key themes, entities, API requirements, frontend assumptions, tests, documentation needs, and concepts.
   - Create new wiki pages (for example, `homework-2/wiki/architecture.md`, `homework-2/wiki/tickets.md`, `homework-2/wiki/frontend.md`) or update existing ones.
   - Update `homework-2/wiki/index.md` to catalog the new or updated pages.
   - Append an entry to `homework-2/wiki/log.md` in the format `## [YYYY-MM-DD] Ingest | <Source Name>`.

2. **Query**:
   - Read `homework-2/wiki/index.md` to discover relevant pages.
   - Retrieve and synthesize the information needed to answer the user's question.
   - If the synthesis is reusable project knowledge, save it as a new wiki page in `homework-2/wiki/` and update the index/log.

3. **Lint**:
   - Check for contradictions, stale claims, duplicated concepts, or orphan pages in `homework-2/wiki/`.
   - Compare synthesized pages against immutable sources in `homework-2/wiki/raw/`.
   - Suggest updates or perform focused cleanup.

## Documentation Rules

- Keep REST API architecture aligned with the `homework-1` layering style: routes, controller, schema/model, service, repository, shared errors, and app/server entry points.
- Adapt backend examples to tickets, imports, classification, and test/documentation deliverables.
- Keep frontend documentation intentionally skeletal until a later step defines the Next.js implementation details.
- Do not treat raw source files as editable working documents.
