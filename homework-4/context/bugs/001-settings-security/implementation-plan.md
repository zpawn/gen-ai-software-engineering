## Plan Summary

- Status: PASS
- Scenario ID: `001-settings-security`
- Covered issues: BUG-001, BUG-002, SEC-001
- Strategy: (1) Add `@IsOptional()` to the four DTO fields in `src/settings/dto/update-settings.dto.ts` that currently lack it, so omission is accepted while present-value validation is unchanged. (2) Change the three private update methods in `src/settings/settings.service.ts` so each field is written only when explicitly present (`!== undefined`) on `UpdateSettingsDto`, preserving stored values for omitted fields on existing entities while keeping documented defaults for newly created entities, all inside the existing single transaction. (3) Remove the plaintext Jira `apiKey` from the response contract by editing `src/settings/dto/response-settings.dto.ts` (`apiKey: string` -> `configured: boolean`) and `src/settings/settings.service.ts#mapToResponse()` (`apiKey: user.jiraSettings?.apiKey || ''` -> `configured: Boolean(user.jiraSettings?.apiKey)`), leaving the Jira API key write path (`updateJiraSettings`) untouched so updates still work. No controller, module, or entity changes are required.

## Preconditions

- `verified-research.md`: Status `PASS`, quality `EXCELLENT`, 17/17 claims verified, 0 discrepancies (confirmed by direct read).
- All cited source lines re-read directly and match the claims verbatim:
  - `src/settings/dto/update-settings.dto.ts` (full file, 56 lines) — matches R-001–R-006.
  - `src/settings/settings.service.ts` (full file, 156 lines) — matches R-007–R-011, R-013, R-015.
  - `src/settings/dto/response-settings.dto.ts` (full file, 25 lines) — matches R-014.
  - `src/settings/settings.controller.ts` (full file) — matches R-016.
  - `src/settings/entities/jira-settings.entity.ts`, `ai-settings.entity.ts`, `google-calendar-settings.entity.ts` — match R-012 (nullable columns, `authType` default `BEARER`, `summaryLevel` default `MEDIUM`).
  - `src/main.ts:13-19` — matches R-005 (`whitelist: true`, `transform: true`), confirming that fields absent from the request body remain `undefined` on the transformed DTO instance rather than being coerced to a default.
- `bug-context.md` read in full; all three required issues have explicit acceptance criteria and reproduction steps.
- `package.json` read in full; only `build` (`nest build`) and `test` (`jest`) scripts exist and are used below. Jest config: `rootDir: src`, `testRegex: .*\.spec\.ts$`.
- Confirmed via `Glob` that `src/settings/**/*.spec.ts` currently has no matches — there are no pre-existing settings unit tests; all settings-focused test cases below are `GENERATED_REGRESSION` for the Unit Test Generator. `npm test` still functions as a whole-repository regression guard for the Bug Fixer.
- Assumption (does not replace evidence, used only for edit-scope wording): distinguishing "omitted" from "explicitly provided empty/falsy value" is implemented as a `!== undefined` presence check on each `UpdateSettingsDto` property, which is consistent with the `whitelist`/`transform` pipeline confirmed in R-005/`main.ts:13-19`.

## Changes by File

### `src/settings/dto/update-settings.dto.ts`

- Issues: BUG-001. Verified claims: R-001, R-002, R-003, R-004, R-005, R-006.
- Current behavior: `aiModel?`, `aiProvider?`, `aiFineTuning?` (lines 16-23) carry only `@IsString()`; `googleCalendars?` (lines 29-31) carries only `@IsArray()` + `@IsString({ each: true })`. None carry `@IsOptional()`, so `class-validator` validates them even when omitted (`src/settings/dto/update-settings.dto.ts:16-23`, `:29-31`). Correctly-optional fields such as `aiSummaryLevel` (line 25), `jiraApiKey` (line 34), `jiraEmail` (line 43), `jiraIssueKey` (line 47), and `jiraUrl` (line 51) already pair a type validator with `@IsOptional()` (`:25-27`, `:33-55`). `jiraAuthType` (lines 37-40) is intentionally required and must stay required.
- Intended behavior: Every field declared with `?` in the TypeScript type consistently supports omission; when a field is present, its existing constraint validators still run unchanged.
- Exact edit scope: add `@IsOptional()` as an additional decorator to exactly these four properties, matching the existing decorator-ordering pattern used for `jiraApiKey`/`jiraEmail`/etc.:
  - `aiModel?: string` (currently line 16-17)
  - `aiProvider?: string` (currently line 19-20)
  - `aiFineTuning?: string` (currently line 22-23)
  - `googleCalendars?: string[]` (currently line 29-31)
  Do not add, remove, or reorder any other decorator; do not touch `jiraAuthType`.
- Acceptance criteria: a DTO instance with any subset (including none) of `aiModel`, `aiProvider`, `aiFineTuning`, `googleCalendars` omitted produces no validation errors for those properties; a DTO instance that supplies an invalid value for any of the four (e.g., a non-string `aiModel`, a non-array `googleCalendars`, or a `googleCalendars` array containing a non-string element) still produces a validation error; `jiraAuthType` remains required.
- Proof: T-003, T-004 (GENERATED_REGRESSION); T-001, T-002 (build/full-suite guard).

### `src/settings/settings.service.ts`

- Issues: BUG-002, SEC-001. Verified claims: R-007, R-008, R-009, R-010, R-011, R-012 (BUG-002); R-013, R-015 (SEC-001).
- Current behavior (BUG-002):
  - `updateUserSettings()` (`:29-41`, transaction body `:32-38`) unconditionally calls `updateAISettings`, `updateJiraSettings`, `updateGoogleSettings` for every request inside one `transactionEM.transaction(...)` block, then `transactionEM.save(User, user)`.
  - `updateGoogleSettings()` (`:87-105`) sets `calendarIds` to `updateDto.googleCalendars || []` in both the create branch (`:92-96`) and the update branch (`:98`), so an omitted `googleCalendars` clears an existing list.
  - `updateAISettings()` (`:107-129`) sets `llm`, `provider`, `fineTuning` to `... || ''` and `summaryLevel` to `... || SummaryLevel.MEDIUM` in both branches (`:112-126`), so omitted AI fields are wiped on an existing entity.
  - `updateJiraSettings()` (`:131-155`) sets `apiKey`, `email`, `issueKey`, `url` to `... || ''` and `authType` to `... || JiraAuthType.BEARER` in both branches (`:137-151`), so omitted Jira fields are wiped on an existing entity.
- Current behavior (SEC-001): `mapToResponse()` (`:63-85`) sets `apiKey: user.jiraSettings?.apiKey || ''` (`:82`, part of R-013's cited `:77-83`), and `getUserSettings()` (`:24-26`) returns this mapped object with no masking, so the plaintext key reaches any authenticated caller of `GET /settings`.
- Intended behavior: Omitted properties in a partial `UpdateSettingsDto` preserve the currently stored value on an existing entity; an explicitly supplied value (including an explicitly supplied empty string or empty array) is applied as given; a newly created entity (no existing `aiSettings`/`jiraSettings`/`googleCalendarSettings` row) still receives the documented defaults (`''`, `[]`, `SummaryLevel.MEDIUM`, `JiraAuthType.BEARER`) for any field the caller did not supply. The transaction structure in `updateUserSettings()` stays exactly as-is (all three group updates plus `save(User, user)` inside one `transactionEM.transaction(...)` call) so atomicity is preserved. Separately, `mapToResponse()` never includes the Jira API key in the returned object; it exposes only a non-sensitive `configured: boolean` derived from whether a key is stored.
- Exact edit scope:
  - `updateGoogleSettings` (method body, `:87-105`): in the existing-entity (`else`) branch, only assign `user.googleCalendarSettings.calendarIds = updateDto.googleCalendars` when `updateDto.googleCalendars !== undefined`; otherwise leave the property untouched. In the create branch, keep `calendarIds: updateDto.googleCalendars || []`.
  - `updateAISettings` (method body, `:107-129`): in the existing-entity (`else`) branch, replace each unconditional `... = updateDto.<field> || <fallback>` assignment for `llm`, `provider`, `fineTuning`, `summaryLevel` with an assignment guarded by `updateDto.<field> !== undefined`, otherwise leave the current entity property unchanged. Keep the create-branch `... || <fallback>` assignments unchanged.
  - `updateJiraSettings` (method body, `:131-155`): same guarded-assignment treatment in the existing-entity (`else`) branch for `apiKey`, `authType`, `email`, `issueKey`, `url`. Keep the create-branch `... || <fallback>` assignments unchanged.
  - `mapToResponse()` (`:63-85`): remove the `apiKey: user.jiraSettings?.apiKey || ''` line (`:82`) from the returned `jira` object and add `configured: Boolean(user.jiraSettings?.apiKey)` in its place. Do not change `url`, `issueKey`, `authType`, `email` mappings (`:78-81`).
  - Do not modify `updateUserSettings()` (`:29-41`), `findUserWithRelations()` (`:45-61`), or the repository/constructor wiring (`:11-22`).
- Acceptance criteria:
  - Updating one field (e.g. only `jiraIssueKey`) on a user with existing non-empty AI, Jira, and Google settings leaves all other stored fields in all three groups byte-for-byte unchanged after the update.
  - A brand-new user's first settings update still receives the documented defaults for any field not supplied.
  - An explicitly supplied empty array/string (e.g. `googleCalendars: []`) still clears the corresponding field, distinguishing "provided empty" from "omitted."
  - `updateUserSettings()` still performs all writes inside a single `EntityManager.transaction(...)` call (no method is skipped or moved outside the transaction).
  - `GET /settings` response never contains a `jira.apiKey` property (or any property carrying the raw stored key) for any user, whether or not a key is configured; `jira.configured` is `true` when a key is stored and `false` otherwise.
  - `POST /settings` (i.e., `updateJiraSettings`) can still store a newly supplied `jiraApiKey`.
- Proof: T-005, T-006, T-007, T-010 (BUG-002, GENERATED_REGRESSION); T-008 (SEC-001, GENERATED_REGRESSION); T-001, T-002 (build/full-suite guard).

### `src/settings/dto/response-settings.dto.ts`

- Issues: SEC-001. Verified claims: R-014.
- Current behavior: The `jira` shape of `ResponseSettingsDto` declares `apiKey: string` (`src/settings/dto/response-settings.dto.ts:18-24`, specifically line 23), making the sensitive credential part of the public response contract.
- Intended behavior: The public response contract no longer declares a sensitive `apiKey` field; it declares a non-sensitive `configured: boolean` instead, consistent with the bug-context expected behavior ("may expose a non-sensitive boolean such as `configured`").
- Exact edit scope: in the `jira` property of the `ResponseSettingsDto` interface, remove `apiKey: string;` (line 23) and add `configured: boolean;` in its place. Do not change `url`, `issueKey`, `authType`, or `email` declarations (lines 19-22), and do not change the `google` or `ai` shapes.
- Acceptance criteria: the `ResponseSettingsDto` TypeScript type has no `apiKey` property anywhere; `nest build` compiles cleanly against the updated `mapToResponse()` return value (structural match required, since `mapToResponse()`'s return type is `ResponseSettingsDto`).
- Proof: T-008 (runtime absence of `apiKey`), T-001 (build proves the interface/implementation stay structurally consistent).

## Test Plan

Package.json scripts used (verbatim):
- `"build": "nest build"`
- `"test": "jest"`

Derived commands for the Bug Fixer to run after each logical fix (no new commands invented):
- `npm run build`
- `npm test`
- `npm test -- --testPathPattern=settings` (Jest selector restricted to the settings feature, once the Unit Test Generator has added `*.spec.ts` files under `src/settings/`; `rootDir: src`, `testRegex: .*\.spec\.ts$` per Jest config)

| ID | Type | Issue(s) | Production change covered | Observable behavior | Expected result |
|---|---|---|---|---|---|
| T-001 | EXISTING_VALIDATION | BUG-001, BUG-002, SEC-001 | All three files | `npm run build` (`nest build`) compiles the project after edits | Build succeeds with no TypeScript errors, confirming `ResponseSettingsDto`/`mapToResponse()` stay structurally consistent and DTO decorator changes are syntactically valid |
| T-002 | EXISTING_VALIDATION | BUG-001, BUG-002, SEC-001 | All three files | `npm test` (`jest`, full existing suite) run by the Bug Fixer after each logical fix | All pre-existing specs outside `src/settings/` continue to pass; no regression introduced elsewhere |
| T-003 | GENERATED_REGRESSION | BUG-001 | `update-settings.dto.ts` — added `@IsOptional()` | Validate an `UpdateSettingsDto` instance with `aiModel`, `aiProvider`, `aiFineTuning`, `googleCalendars` all omitted (only `jiraAuthType` + one Jira field present, per bug-context repro) | `class-validator`'s `validate()` returns no errors for the omitted properties |
| T-004 | GENERATED_REGRESSION | BUG-001 | `update-settings.dto.ts` — added `@IsOptional()` | Validate an instance where `aiModel` is a non-string, or `googleCalendars` contains a non-string element, while present | `validate()` still returns an error for that property (existing constraint validators are not weakened) |
| T-005 | GENERATED_REGRESSION | BUG-002 | `settings.service.ts` — guarded assignment in `updateAISettings`/`updateJiraSettings`/`updateGoogleSettings` | Call `updateUserSettings()` for a user with existing non-empty AI, Jira, and Google settings, supplying only `jiraIssueKey` | Returned/stored settings show unchanged `aiModel`, `aiProvider`, `aiFineTuning`, `aiSummaryLevel`, `googleCalendars`, `jiraApiKey`, `jiraAuthType`, `jiraEmail`, `jiraUrl`; only `jiraIssueKey` changed |
| T-006 | GENERATED_REGRESSION | BUG-002 | `settings.service.ts` — unchanged create-branch defaults | Call `updateUserSettings()` for a user with no existing `aiSettings`/`jiraSettings`/`googleCalendarSettings`, supplying a partial DTO | New entities are created with `''`/`[]`/`SummaryLevel.MEDIUM`/`JiraAuthType.BEARER` defaults for every field not supplied, and supplied fields set as given |
| T-007 | GENERATED_REGRESSION | BUG-002 | `settings.service.ts` — presence-check distinguishing omitted vs. explicit empty | Call `updateUserSettings()` on an existing user, explicitly supplying `googleCalendars: []` | Stored `calendarIds` becomes `[]` (explicit clear honored), while other omitted fields remain unchanged |
| T-008 | GENERATED_REGRESSION | SEC-001 | `settings.service.ts#mapToResponse()` and `response-settings.dto.ts` | Call `getUserSettings()` for a user with a configured Jira API key, then for a user without one | Returned object has no `apiKey` key anywhere under `jira`; `jira.configured` is `true` for the first user and `false` for the second |
| T-009 | GENERATED_REGRESSION | SEC-001 | `settings.service.ts` — Jira update path unchanged | Call `updateUserSettings()` supplying a new `jiraApiKey`, then call `getUserSettings()` | The stored `jiraSettings.apiKey` reflects the newly supplied value (update path still functions) even though it is never returned in the response (`configured` is `true`) |
| T-010 | GENERATED_REGRESSION | BUG-002 | `settings.service.ts#updateUserSettings()` — transaction structure preserved | Force one of `updateAISettings`/`updateJiraSettings`/`updateGoogleSettings` to throw inside the transaction | No partial writes are persisted (rollback), confirming atomicity is preserved after the guarded-assignment change |

Notes:
- T-003 through T-010 are `GENERATED_REGRESSION` cases to be authored by the Unit Test Generator as new `*.spec.ts` files under `src/settings/`; the Bug Fixer does not create or edit them.
- T-001 and T-002 are the only checks the Bug Fixer runs directly, using the exact `build`/`test` scripts from `package.json`.
- No manual-only verification is required; all acceptance criteria above are provable through the listed automated commands and generated unit tests once T-003–T-010 exist.

## Risks and Guardrails

- Risk: Adding `@IsOptional()` in the wrong place or to the wrong property could silently weaken validation on `jiraAuthType` or another required field. Guardrail: edit scope is limited to exactly `aiModel`, `aiProvider`, `aiFineTuning`, `googleCalendars` (R-001–R-003); `jiraAuthType` and already-correct optional fields (R-004) must not be touched.
- Risk: A naive partial-update fix could allow an explicitly supplied empty value to be silently ignored (never clearing a field), violating BUG-002's "explicit clearing" acceptance criterion. Guardrail: the presence check must be `!== undefined`, not falsy-based (`||`), so an explicit `''`/`[]` is still applied; only a genuinely absent property preserves the stored value.
- Risk: Restructuring `updateUserSettings()` to skip a group update conditionally could break the single-transaction atomicity guarantee. Guardrail: keep all three group-update calls and `transactionEM.save(User, user)` inside the existing `transactionEM.transaction(...)` block, unmodified at the call-site level (`settings.service.ts:29-41`); only the internals of the three private methods change.
- Risk: Removing `apiKey` from the response could break any caller that also relies on it to write settings back (round-trip pattern). Guardrail: SEC-001's acceptance criteria explicitly require the update path (`jiraApiKey` in `UpdateSettingsDto`, consumed by `updateJiraSettings`) to keep working; only the read/response path is changed, and T-009 proves the write path still functions.
- Risk: Scope creep into entities, controller, module, or other features. Guardrail: per bug-context Out of Scope, changes are limited to the three named files under `src/settings/`; no entity/column changes, no controller/module changes, no changes outside the settings feature.
- Risk: Sensitive data leaking into reports or fixtures during this work. Guardrail: any Jira key value referenced in future test fixtures must use an obvious placeholder (e.g., `test-jira-api-key`), consistent with bug-context instructions; this plan introduces no real credentials.
- Risk: Test-file drift or the Bug Fixer overreaching into test authoring. Guardrail: the Bug Fixer is authorized to mutate only the three production files listed above (`src/settings/dto/update-settings.dto.ts`, `src/settings/settings.service.ts`, `src/settings/dto/response-settings.dto.ts`); it must not create, edit, or delete any `*.spec.ts` file — all T-003–T-010 cases are reserved for the Unit Test Generator.

## References

- R-001, R-002, R-003, R-004, R-005, R-006 — `src/settings/dto/update-settings.dto.ts`; R-005/R-006 also `src/main.ts`.
- R-007, R-008, R-009, R-010, R-011, R-013, R-015 — `src/settings/settings.service.ts`.
- R-012 — `src/settings/entities/jira-settings.entity.ts`, `src/settings/entities/ai-settings.entity.ts`, `src/settings/entities/google-calendar-settings.entity.ts`.
- R-014 — `src/settings/dto/response-settings.dto.ts`.
- R-016, R-017 — `src/settings/settings.controller.ts`, `src/settings/settings.service.ts`.
- `context/bugs/001-settings-security/bug-context.md` — scenario definition, acceptance criteria, and Out of Scope constraints.
- `package.json` — `build` and `test` script definitions and Jest configuration used in the Test Plan.
