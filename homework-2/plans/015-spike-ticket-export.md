# Plan 015 (spike): Design a ticket export endpoint — close the import/export asymmetry

> **Executor instructions**: This is a DESIGN SPIKE, not a build plan. The
> deliverable is a written design document plus a small throwaway prototype —
> NOT production code merged into `src/`. Follow the steps, honor STOP
> conditions, and update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/`
> Drift from DONE plans in `plans/README.md` is expected; re-read the cited
> code sections before designing against them.

## Status

- **Priority**: P3 (direction — maintainer's call)
- **Effort**: M (coarse — spike itself is S)
- **Risk**: LOW (additive read-only endpoint)
- **Depends on**: plans/010-list-pagination.md (filter/contract decisions interact), plans/012-importer-xml-csv-hardening.md (serializer symmetry)
- **Category**: direction
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

The API imports tickets in three formats — CSV, JSON, XML (`ticket.importer.ts`, `POST /tickets/import`) — but there is no way to get data back out in any of them: no export route exists in `ticket.routes.ts`, and `GET /tickets` returns only JSON (paginated after plan 010). Users who bulk-load tickets have no reporting/backup/hand-off path. Import-without-export is a classic one-directional gap, and the format knowledge to invert it already lives in the importer.

## Current state (evidence)

- `homework-2/backend/src/modules/tickets/ticket.routes.ts:25-63` — 8 routes; grep confirms no export/download/report handler.
- `homework-2/backend/src/modules/tickets/ticket.importer.ts` — parses csv/json/xml; field set: customer_id, customer_email, customer_name, subject, description, category, priority, status, assigned_to, tags, metadata{source,browser,device_type} (see `normalizeFlatRecord` lines 140-158 for the flat CSV column naming: `metadata.source` / `metadata_source`).
- Filters available to reuse: `TicketFilters` (`ticket.model.ts`) — category, priority, status, customer_id, customer_email, assigned_to, tag, source (+ limit/offset after plan 010).
- Wiki context: `homework-2/wiki/frontend.md` documents a bulk import form in the dashboard — an export button is its natural sibling.

## Scope

**In scope (deliverables)**:
- `plans/015-spike-ticket-export.OUTCOME.md` (create — the design doc)
- A prototype allowed ONLY under `homework-2/backend/tests/` as an exploratory test file, or in a scratch directory — deleted or clearly marked before finishing
- `plans/README.md` (status row)

**Out of scope**:
- Any change under `backend/src/` or `frontend/src/` — the build happens in a future plan derived from this spike.

## Steps

### Step 1: Answer the design questions

Write `plans/015-spike-ticket-export.OUTCOME.md` answering, with a recommendation and rationale each:

1. **Route & contract**: `GET /tickets/export?format=csv|json|xml` + existing filters. How does it interact with pagination (recommendation: export ignores limit/offset and returns the full filtered set — justify or refute) and with plan 006's payload thinking (an export of a huge table — cap? stream? `Content-Disposition` filename?).
2. **Round-trip fidelity**: exported CSV/XML must re-import losslessly through the existing importer (same columns as `normalizeFlatRecord` expects; same XML element names the parser reads). Define the exact column/element list, including how tags (importer splits on `[|;,]`) and metadata flatten. Decide whether classification fields (`classification_confidence` etc.) are included (they're not importable — recommend a `?include_classification=true` opt-in or exclusion; justify).
3. **CSV injection**: values starting with `= + - @` can execute as formulas when opened in spreadsheets — the design must specify the mitigation (prefix with `'` or reject — pick one, cite the field set affected: subject, description, names).
4. **XML escaping**: which serializer (mirror of plan 012's parser choice, e.g. fast-xml-parser's builder) and how CDATA/entities are handled on the way out.
5. **Where the code goes**: recommend a `TicketExporter` sibling to `TicketImporter` in `backend/src/modules/tickets/`, wired through service → controller → route, matching the module layout.

### Step 2: Prototype the riskiest slice

A throwaway test that: creates 3 tickets via `buildApp()` + inject (one with a tag containing a comma, one with `=SUM(A1)` as subject prefix, one with an ampersand in the description), serializes them with the proposed CSV/XML approach (inline prototype code in the test), and re-imports the output through the real `POST /tickets/import` — asserting field-level equality. Record results (what broke, what the design must therefore say) in the OUTCOME doc.

**Verify**: prototype test runs (`npm --workspace backend test -- <file>`), and its findings appear in the OUTCOME doc. Then delete the prototype or mark it `.skip` with a comment pointing at the OUTCOME doc.

### Step 3: Effort estimate + open questions

Close the OUTCOME doc with: build-plan effort estimate (expect M), the list of decisions that need the maintainer (classification fields in/out, size cap number, frontend export button now or later), and the recommended next step (turn into a numbered build plan via `improve plan`).

## Done criteria

- [ ] `plans/015-spike-ticket-export.OUTCOME.md` exists and answers all 5 design questions with recommendations
- [ ] Round-trip prototype ran; its findings are recorded
- [ ] No changes under `backend/src/` or `frontend/src/` (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Round-trip through the existing importer is impossible without importer changes (e.g. the CSV writer can't express something the parser needs) — that's a finding, not a blocker: record it as a dependency on plan 012 in the OUTCOME doc and stop the prototype there.

## Maintenance notes

- If plan 012 replaces the XML parser, the export serializer should come from the same library — keep them paired.
- The frontend export button is deliberately not designed here; it's a one-liner against the endpoint once it exists.
