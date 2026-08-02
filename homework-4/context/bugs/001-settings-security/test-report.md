## Test Summary

Status: PASS — Scenario `001-settings-security`. Production files covered: `src/settings/dto/response-settings.dto.ts`, `src/settings/dto/update-settings.dto.ts`, `src/settings/settings.service.ts`. Generated 2 new test files (12 tests total: 6 in `settings.service.spec.ts`, 6 in `update-settings.dto.spec.ts`); 0 existing test files modified. All generated tests, the existing suite, narrow commands, and FIRST assessment pass.

## Changed Code Covered

- **BUG-001** — `src/settings/dto/update-settings.dto.ts:16-35` — Added `@IsOptional()` to `aiModel`, `aiProvider`, `aiFineTuning`, `googleCalendars` so omission no longer fails validation while invalid present values still fail. Proofs: T-003, T-004. Tests: `src/settings/dto/update-settings.dto.spec.ts`.
- **SEC-001 (DTO contract)** — `src/settings/dto/response-settings.dto.ts:23` — `jira.apiKey: string` replaced with `jira.configured: boolean`. Proof: T-008. Tests: `src/settings/settings.service.spec.ts`.
- **SEC-001 (mapToResponse)** — `src/settings/settings.service.ts:82` — `mapToResponse` now returns `configured: Boolean(user.jiraSettings?.apiKey)` instead of the raw `apiKey`. Proofs: T-008, T-009. Tests: `src/settings/settings.service.spec.ts`.
- **BUG-002 (Google)** — `src/settings/settings.service.ts:97-99` — existing-entity branch only overwrites `calendarIds` when `updateDto.googleCalendars !== undefined`; create-branch default `|| []` preserved. Proofs: T-005, T-006, T-007. Tests: `src/settings/settings.service.spec.ts`.
- **BUG-002 (AI)** — `src/settings/settings.service.ts:120-133` — existing-entity branch guards each of `aiModel`/`aiProvider`/`aiFineTuning`/`aiSummaryLevel` with `!== undefined`; create-branch defaults (`''`, `SummaryLevel.MEDIUM`) preserved. Proofs: T-005, T-006. Tests: `src/settings/settings.service.spec.ts`.
- **BUG-002 (Jira)** — `src/settings/settings.service.ts:152-168` — existing-entity branch guards each of `jiraApiKey`/`jiraAuthType`/`jiraEmail`/`jiraIssueKey`/`jiraUrl` with `!== undefined`; create-branch defaults preserved; write path for `jiraApiKey` still functions. Proofs: T-005, T-006, T-009. Tests: `src/settings/settings.service.spec.ts`.

## Tests Generated

**`src/settings/dto/update-settings.dto.spec.ts`** (created):
- `passes validation when aiModel, aiProvider, aiFineTuning, and googleCalendars are omitted (T-003)` — asserts `validate()` on a `plainToInstance(UpdateSettingsDto, ...)` with those fields omitted returns zero errors. No external dependencies.
- `fails validation when aiModel is present but not a string (T-004)` — asserts a validation error on `aiModel` when a non-string value is supplied.
- `fails validation when aiProvider is present but not a string (T-004)` — same pattern for `aiProvider`.
- `fails validation when aiFineTuning is present but not a string (T-004)` — same pattern for `aiFineTuning`.
- `fails validation when googleCalendars contains a non-string element (T-004)` — asserts a validation error on `googleCalendars` when an array element is not a string.
- `passes validation when googleCalendars is an explicit empty array (T-003)` — asserts an explicit `[]` still validates cleanly (omission vs. explicit-empty distinction feeds BUG-002 tests too).

**`src/settings/settings.service.spec.ts`** (created), using `Test.createTestingModule` with `getRepositoryToken` mocks for `User`, `AISettings`, `JiraSettings`, `GoogleCalendarSettings`, and a mocked `manager.transaction` invoking a fake `EntityManager` (`save: jest.fn()`):
- `leaves AI, Google, and other Jira fields unchanged when only jiraIssueKey is updated (T-005)` — asserts all non-targeted `ai`/`google`/`jira` fields are unchanged after updating only `jiraIssueKey` on a user with pre-existing settings.
- `applies documented defaults on the create branch when AI/Jira/Google fields are omitted (T-006)` — asserts `''`/`[]`/`SummaryLevel.MEDIUM`/`JiraAuthType.BEARER` defaults on a brand-new user with no prior settings rows.
- `clears stored calendars when googleCalendars is explicitly an empty array (T-007)` — asserts explicit `[]` clears previously stored non-empty `calendarIds`.
- `reports jira.configured true and omits apiKey when a key is stored (T-008)` — asserts `jira.configured === true` and no `apiKey` property/value anywhere in the response.
- `reports jira.configured false and omits apiKey when no key is stored (T-008)` — asserts `jira.configured === false` and no `apiKey` property when no Jira settings exist.
- `still writes a newly supplied jiraApiKey through the update path (T-009)` — asserts a fresh `jiraApiKey` update on a new entity results in `jira.configured === true` while still never exposing the raw key.

All controlled dependencies: TypeORM `Repository` (`findOne`, `create`) and `EntityManager.transaction`/`save` are Jest mocks; no real PostgreSQL, Jira, Google, or AI provider calls.

## FIRST Assessment

- Fast: PASS — No real network, database, filesystem, or provider calls; all TypeORM repositories and the transactional `EntityManager` are Jest mocks; both suites completed in under 5 seconds each.
- Independent: PASS — `beforeEach` constructs fresh mock repositories, a fresh `EntityManager`, and a fresh `TestingModule` per test; `afterEach` calls `jest.restoreAllMocks()`; no shared mutable state or environment variables across tests.
- Repeatable: PASS — No real clock, randomness, locale, or environment inputs are used; all inputs (user objects, DTOs, mock return values) are fully deterministic literals defined per test.
- Self-validating: PASS — Every test ends in explicit `expect(...)` assertions against returned response fields or validation-error arrays; no test relies on console output or bare execution success.
- Timely: PASS — Each test title cites its proof ID (T-003–T-009) and directly exercises the guarded `!== undefined` branches, `@IsOptional()` decorators, and `configured: Boolean(...)` mapping introduced in the supplied diff; a regression to the pre-fix unconditional `||` assignments or the pre-fix `apiKey` field/missing `@IsOptional()` would fail these assertions.
- Overall FIRST: PASS

## Test Results

- `npm test -- --runInBand src/settings/settings.service.spec.ts` — exit 0 — Test Suites: 1 passed, 1 total; Tests: 6 passed, 6 total. All `updateUserSettings`/`getUserSettings` cases passed.
- `npm test -- --runInBand src/settings/dto/update-settings.dto.spec.ts` — exit 0 — Test Suites: 1 passed, 1 total; Tests: 6 passed, 6 total. All `UpdateSettingsDto` validation cases passed.
- `npm test -- --runInBand` — exit 0 — Test Suites: 5 passed, 5 total; Tests: 19 passed, 19 total (3 pre-existing `ai/strategies/utils` suites with 7 tests + the 2 new `settings` suites with 12 tests). No failures, no regressions.

## Coverage Gaps

None

## References

- `context/bugs/001-settings-security/fix-summary.md`
- Baseline SHA: `f71015e5a8fd2f883bbd32509602f8d905d961bf`
- `src/settings/dto/update-settings.dto.ts:16,20,23,32`
- `src/settings/dto/response-settings.dto.ts:23`
- `src/settings/settings.service.ts:82,97-99,120-133,152-168`
- `src/settings/dto/update-settings.dto.spec.ts` (created)
- `src/settings/settings.service.spec.ts` (created)
- `package.json` scripts used: `"test": "jest"`
