# Plan 012: XML/CSV import handles real-world files correctly (or rejects them loudly)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/ticket.importer.ts homework-2/backend/tests/`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (accepted-input behavior changes)
- **Depends on**: none (after 005/006 to avoid merge friction in the same module)
- **Category**: bug
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

XML import is parsed with hand-rolled regexes: no CDATA, no attributes-with-`>` edge cases, no numeric character references (`&#39;` survives verbatim into stored data), and nested/duplicate tags mis-slice. The importer reports success while silently corrupting fields — a data-integrity failure on the product's core bulk-import feature. Multi-line CSV values (quoted newlines) are also silently broken because the CSV parser splits on newlines before parsing quotes. One deliberate positive: the regex approach performs no entity expansion, so classic XXE is structurally absent — the fix must not reintroduce it.

## Current state

`homework-2/backend/src/modules/tickets/ticket.importer.ts` (219 lines):

```ts
// line 78 — ticket extraction
const ticketMatches = [...content.matchAll(/<ticket\b[^>]*>([\s\S]*?)<\/ticket>/gi)];
// lines 188-191 — per-field tag read, fresh RegExp per field per ticket
private readXmlTag(block: string, tagName: string): string | undefined {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? this.decodeXml(match[1].trim()) : undefined;
}
// lines 193-201 — decodeXml handles exactly 5 named entities (&lt; &gt; &quot; &apos; &amp;); numeric refs untouched
// lines 29-54 — parseCsv: content.split(/\r?\n/) FIRST, then parseCsvLine per line
//   → a quoted field containing a newline is split across two records (silent corruption)
// lines 110-138 — parseCsvLine: char-by-char quote-aware splitter; throws ParseError on unclosed quote
```

Normalization downstream (`normalizeObjectRecord`, lines 160-186) is format-agnostic and stays. Validation happens later in `TicketService.createTicket` (per plan 011's model).

- Tests pinning current formats: `backend/tests/test_import_csv.test.ts`, `test_import_xml.test.ts`, `test_import_json.test.ts` — read all three before changing anything; fixtures may live inline or in `backend/tests/fixtures/`.
- Dependency policy: backend has 4 runtime deps (fastify, cors, drizzle, better-sqlite3) — the repo is deliberately lean. Adding ONE well-maintained parser dependency is acceptable; adding a framework is not.
- Advisor decision: use `fast-xml-parser` for XML (pure JS, maintained, no entity expansion of external/DTD entities by default — verify `processEntities` behavior and DTD handling in the installed version's docs before wiring). For CSV, fix the hand-rolled parser's newline handling rather than adding a second dependency — its quote logic is otherwise sound.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Tests | `npm test` | all pass |
| Import tests only | `npm --workspace backend test -- test_import` | all pass |

## Scope

**In scope**:
- `homework-2/backend/src/modules/tickets/ticket.importer.ts`
- `homework-2/backend/package.json` (add `fast-xml-parser`)
- `homework-2/backend/tests/test_import_xml.test.ts`, `test_import_csv.test.ts` (+fixtures)
- `plans/README.md` (status row)

**Out of scope**:
- JSON import path (uses `JSON.parse` — already correct).
- `normalizeObjectRecord` / `normalizeFlatRecord` — the normalization contract stays.
- Streaming imports (whole-string input is bounded by plan 006's limits — sufficient).
- `ticket.service.ts` — untouched.

## Git workflow

- Branch: current or `advisor/012-importer`.
- Commit: `fix(homework-2): robust XML parsing and multiline CSV fields in importer`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Characterization tests first

Before touching the parser, add tests capturing what must keep working (green before AND after):

1. The existing happy-path XML fixture imports successfully (already covered — confirm).
2. XML with `&amp;`/`&lt;` entities decodes correctly (likely covered — confirm).
3. CSV with quoted comma (`"a, b"`) parses as one field (confirm existing).

**Verify**: `npm --workspace backend test -- test_import` → all pass (unchanged code).

### Step 2: Replace `parseXml` with fast-xml-parser

`npm install fast-xml-parser --workspace backend`. Rewrite `parseXml`:

- Configure the parser with DTD/doctype processing disabled if the version exposes it, entity processing limited to built-ins, and `ignoreAttributes: true` (attributes are not part of this format).
- Accept both a root `<tickets><ticket>…</ticket></tickets>` and a bare sequence of `<ticket>` elements if the current tests include one (check fixtures; wrap the content in a synthetic root before parsing if needed).
- A single `<ticket>` must parse as one record (XML parsers return an object, not array, for single children — normalize with an `ensureArray` helper).
- Map each parsed ticket object through the existing `normalizeObjectRecord`, converting the parsed `<tags><tag>x</tag></tags>` structure to a string array and `<metadata>` children to the metadata object — mirror what the old code extracted (customer_id, customer_email, customer_name, subject, description, category, priority, status, assigned_to, tags, metadata.source/browser/device_type).
- On parser errors throw `ParseError('XML import must contain at least one <ticket> element')` for the empty case (existing message — tests may pin it) and a `ParseError` with the underlying message otherwise.
- Delete `readXmlTag` and `decodeXml` once unreferenced.

**Verify**: `npm --workspace backend test -- test_import` → all pass.

### Step 3: New XML capability tests

1. CDATA: `<description><![CDATA[Crash when <b> clicked & app dies]]></description>` → stored verbatim.
2. Numeric entity: `&#39;` in a subject → decodes to `'`.
3. Nested duplicate tag inside description text is not mis-sliced (e.g. description containing the literal string `</subject>` inside CDATA).
4. Security regression guard: an XML with an internal DTD entity (`<!DOCTYPE t [<!ENTITY x "boom">]>` and `&x;` in a field) either rejects or imports without expanding beyond built-ins — assert no crash and, if it imports, that no file contents/URLs get fetched (structural assertion: parse succeeds/fails fast; no network mocking needed since the parser must not do IO at all — assert the config flag in code review, and in the test just pin the observable outcome you chose).

**Verify**: `npm --workspace backend test -- test_import` → all pass.

### Step 4: Fix multiline CSV fields

Rewrite `parseCsv` to a single char-by-char pass over the whole content (extend the existing `parseCsvLine` state machine to also handle `\n`/`\r\n` as record separators only when not `inQuotes`), instead of `split(/\r?\n/)` first. Keep: header requirement (`customer_email`, `subject`, `description` — existing `ParseError` messages), trim behavior, unclosed-quote `ParseError`.

New test: CSV row with a quoted field containing a newline → one record, field preserved with the newline.

**Verify**: `npm --workspace backend test -- test_import` → all pass; `npm test` → full suite green.

## Test plan

Steps 1, 3, 4. Final: `npm run test:coverage` → thresholds met (importer coverage should rise).

## Done criteria

- [ ] `grep -n 'matchAll(/<ticket' backend/src/modules/tickets/ticket.importer.ts` → no match
- [ ] `grep -n 'readXmlTag' backend/src/modules/tickets/ticket.importer.ts` → no match
- [ ] CDATA, numeric-entity, and multiline-CSV tests exist and pass
- [ ] `npm run test:coverage` exits 0, thresholds met
- [ ] Exactly one new dependency in `backend/package.json` (`fast-xml-parser`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Existing XML fixtures use structures the old regex accepted but a real parser rejects (malformed XML that happened to match the regexes) — do NOT bend the parser config to accept malformed input; report the fixture and proposed fixture fix.
- `fast-xml-parser`'s installed major version cannot disable DTD/entity expansion — STOP; the security posture must not regress. Report and propose an alternative (e.g. `@rgrove/parse-xml`).
- More than 2 existing import tests change expectations — blast radius review needed; report first.

## Maintenance notes

- Reviewer: the parser config is the security surface — verify DTD/external entity handling is off and pin it with a comment linking to the parser docs.
- The synthetic-root wrapping (if used) is the subtle bit — document it in a code comment.
- Streaming imports for >1MB files remain deliberately unsupported (plan 006 bounds the payload).
