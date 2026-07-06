# Plan 004: Framework 4xx errors reach clients as 4xx, not 500

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/shared/error-handler.ts homework-2/backend/tests/`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

The global error handler only recognizes Fastify validation errors and the app's own `AppError`; every other error — including client errors Fastify itself raises, like malformed JSON bodies (400), payload too large (413), unsupported media type (415) — falls through to a generic `500 Internal Server Error`. Clients (including the frontend, which displays `error.error` from the response body) cannot distinguish their own bad request from a server outage, and monitoring counts client mistakes as server failures.

## Current state

`homework-2/backend/src/shared/error-handler.ts` (entire file, 27 lines):

```ts
export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error.validation) {
    const details = error.validation.map((violation) => ({
      field: violation.instancePath?.replace(/^\//, '') || violation.params?.missingProperty || 'unknown',
      message: violation.message ?? 'Invalid value',
    }));
    return reply.status(400).send({ error: 'Validation failed', details });
  }

  if (error instanceof AppError) {
    if (error.statusCode === 404) {
      return reply.status(404).send({ error: error.message });
    }
    return reply.status(error.statusCode).send({
      error: error.message,
      details: error.details,
    });
  }

  request.log.error(error);
  return reply.status(500).send({ error: 'Internal Server Error' });
}
```

Registered in `homework-2/backend/src/app.ts:15` via `fastify.setErrorHandler(errorHandler)`. `AppError` lives in `homework-2/backend/src/shared/errors.ts`. Fastify errors carry a numeric `statusCode` property (e.g. `FST_ERR_CTP_INVALID_MEDIA_TYPE` → 415, JSON parse failure → 400).

Error-response convention in this repo: JSON body `{ error: string, details?: [...] }` — keep it.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Tests | `npm test` | all pass |

## Scope

**In scope**:
- `homework-2/backend/src/shared/error-handler.ts`
- `homework-2/backend/tests/test_ticket_api.test.ts` (or new `tests/test_error_handler.test.ts`)
- `plans/README.md` (status row)

**Out of scope**:
- `src/shared/errors.ts` (AppError hierarchy) — unchanged.
- Response shape `{ error, details? }` — clients depend on it.
- `app.ts` — registration stays as is.

## Git workflow

- Branch: current or `advisor/004-error-handler`.
- Commit: `fix(homework-2): preserve framework 4xx status codes in error handler`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Honor framework 4xx in the fallthrough

Replace the final fallthrough block with:

```ts
const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
if (statusCode >= 400 && statusCode < 500) {
  return reply.status(statusCode).send({ error: error.message });
}

request.log.error(error);
return reply.status(500).send({ error: 'Internal Server Error' });
```

Rules encoded: framework 4xx passes through with its own message (safe — Fastify 4xx messages describe the client's mistake, not internals); anything ≥500 or without a status stays a generic 500 with the details only in the server log (no internal error leakage — this is deliberate, keep it).

**Verify**: `npm --workspace backend run build` → exit 0.

### Step 2: Regression tests

Using `buildApp()` + `app.inject()` (pattern: `tests/test_ticket_api.test.ts`):

1. `POST /api/v1/tickets` with header `content-type: application/json` and body `'{invalid'` → expect status 400 (currently 500 — this is the regression guard).
2. `POST /api/v1/tickets` with `content-type: text/plain` and any body → expect 415.
3. Existing behavior guards: a `ValidationError` case (missing required field → 400 with `details`) and a 404 (`GET /tickets/nonexistent-id`) still pass — likely already covered by existing tests; confirm rather than duplicate.

**Verify**: `npm test` → all pass, including the 2 new tests.

## Test plan

Covered in Step 2; model after `tests/test_ticket_api.test.ts`. Run: `npm test`.

## Done criteria

- [ ] `npm --workspace backend run build` exits 0
- [ ] `npm test` exits 0; new tests for malformed JSON (400) and wrong content-type (415) pass
- [ ] 5xx and status-less errors still return the generic `{ error: 'Internal Server Error' }` body
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The error-handler file no longer matches the excerpt (drift).
- Fastify's injected 4xx errors don't carry `statusCode` as assumed (test 1 still returns 500 after the change) — investigate the actual error shape via `request.log`; if it requires matching on `error.code` string constants instead, that's a small pivot — do it; if it requires touching `app.ts` body parsers, STOP.
- Any existing test asserts a 500 for these cases — report before rewriting the assertion.

## Maintenance notes

- If auth lands later (plan 013), its 401/403 errors should be `AppError` subclasses so they hit the existing branch — reviewer should watch that new error types don't rely on the fallthrough.
- Deliberately deferred: exposing 5xx details in dev mode (nice-to-have, not needed now).
