# Bug Context: Settings Partial Updates and Credential Exposure

## Scenario Metadata

- **Scenario ID:** `001-settings-security`
- **Component:** Settings API
- **Endpoint:** `POST /api/v2/settings` and `GET /api/v2/settings`
- **Scope:** Two functional bugs and one security vulnerability
- **Baseline status:** Intentionally vulnerable for the multi-agent pipeline exercise

## Purpose

This scenario provides a small, controlled set of defects for the homework
pipeline to research, verify, plan, fix, security-review, and cover with unit
tests. The pipeline must limit its production-code changes to the settings
feature unless a verified dependency requires another change.

Do not place real Jira credentials, access tokens, or other secrets in agent
reports, test fixtures, screenshots, or logs. Use obvious placeholders such as
`test-jira-api-key`.

## BUG-001: Optional Settings Fields Fail Validation When Omitted

### Type and priority

- **Type:** Functional bug
- **Priority:** High

### Description

Several properties in `UpdateSettingsDto` are optional at the TypeScript level
but do not use the `@IsOptional()` validator. `class-validator` therefore
applies validators to missing values. A partial settings update can be rejected
even though the DTO declares those properties with `?`.

### Steps to reproduce

1. Start the application and authenticate as a test user.
2. Send a settings update containing `jiraAuthType` and only one setting to
   change, for example:

   ```http
   POST /api/v2/settings
   Authorization: Bearer <test-access-token>
   Content-Type: application/json

   {
     "jiraAuthType": "bearer",
     "jiraIssueKey": "DEMO-1"
   }
   ```

3. Observe validation errors for omitted fields such as `aiModel`,
   `aiProvider`, `aiFineTuning`, or `googleCalendars`.

### Actual behavior

The request can fail validation because omitted optional properties are still
checked by `@IsString()`, `@IsArray()`, and related validators.

### Expected behavior

Fields declared as optional may be omitted. When present, each field must still
be validated using its existing type and constraint validators.

### Source references

- `src/settings/dto/update-settings.dto.ts:16-23` — optional AI fields use
  `@IsString()` without `@IsOptional()`.
- `src/settings/dto/update-settings.dto.ts:29-31` — optional
  `googleCalendars` uses array/string validators without `@IsOptional()`.
- `src/settings/dto/update-settings.dto.ts:25-27` and
  `src/settings/dto/update-settings.dto.ts:33-55` — examples of properties
  that already use `@IsOptional()`.

### Acceptance criteria

- Every DTO property declared with `?` consistently supports omission.
- Existing validation still rejects invalid values when an optional property
  is present.
- Unit tests cover both omitted optional fields and invalid provided values.
- No unrelated validation rules are weakened.

## BUG-002: Partial Update Erases Existing Settings

### Type and priority

- **Type:** Functional bug
- **Priority:** High

### Preconditions

A test user already has non-empty AI, Jira, and Google Calendar settings.

### Steps to reproduce

1. Save non-empty settings for the test user.
2. Send a second request that changes only one setting, such as
   `jiraIssueKey`.
3. Read the user's settings again.
4. Observe that omitted AI, Jira, or Google values have been replaced with
   empty strings, empty arrays, or defaults.

### Actual behavior

The service always executes all three update methods. Existing entities assign
fallback values such as `updateDto.aiModel || ''` and
`updateDto.googleCalendars || []`, so omission is treated as a request to clear
data.

### Expected behavior

Omitted properties preserve their current stored values. Only properties
explicitly supplied by the caller are updated. An explicitly supplied empty
value may clear a field only where the API contract permits that behavior.

### Source references

- `src/settings/settings.service.ts:32-35` — every settings group is updated
  for every request.
- `src/settings/settings.service.ts:92-99` — missing Google calendars become
  an empty array.
- `src/settings/settings.service.ts:112-125` — missing AI fields become empty
  strings or the default summary level.
- `src/settings/settings.service.ts:136-151` — missing Jira fields become
  empty strings or the default authentication type.

### Acceptance criteria

- Updating one field does not mutate omitted fields in the same settings
  entity.
- Updating one settings group does not erase values in another group.
- New settings entities receive documented defaults where appropriate.
- Unit tests cover existing entities, partial DTOs, and explicit allowed
  clearing behavior.
- The update remains atomic through the existing transaction.

## SEC-001: Jira API Key Is Returned in the Settings Response

### Type and severity

- **Type:** Security vulnerability — sensitive data exposure
- **Initial severity:** High

### Description

`getUserSettings()` maps the stored Jira API key directly into the response
object, and `ResponseSettingsDto` explicitly exposes an `apiKey` property. Any
authenticated caller or client-side script able to read this endpoint receives
the reusable Jira credential.

### Steps to reproduce

1. Configure a placeholder Jira API key for a test user.
2. Send an authenticated request:

   ```http
   GET /api/v2/settings
   Authorization: Bearer <test-access-token>
   ```

3. Inspect `jira.apiKey` in the JSON response.

### Actual behavior

The response includes the stored Jira API key as plaintext.

### Expected behavior

The API never returns the stored Jira credential. The response may expose a
non-sensitive boolean such as `configured` if the UI needs to know whether a
credential exists.

### Source references

- `src/settings/settings.service.ts:77-83` — `mapToResponse()` copies the
  stored API key into the response.
- `src/settings/dto/response-settings.dto.ts:18-24` — the public response
  contract declares `jira.apiKey`.
- `src/settings/settings.service.ts:24-26` — `getUserSettings()` returns the
  mapped response.

### Acceptance criteria

- `GET /api/v2/settings` never returns the Jira API key.
- The public response type no longer declares the sensitive `apiKey` field.
- Existing update behavior can still accept a new Jira API key.
- Unit tests assert that serialized/mapped settings do not contain the key.
- Reports and test fixtures use placeholder values only.
- The security verifier confirms that the changed code does not introduce a
  replacement credential leak.

## Pipeline Expectations

The pipeline must:

1. Research all three issues and cite the current source accurately.
2. Verify every research claim before planning.
3. Include all three issues in one implementation plan.
4. Apply only plan-approved production changes.
5. Run relevant tests after each logical fix.
6. Review only changed code for remaining security vulnerabilities.
7. Generate FIRST-compliant unit tests for changed behavior.
8. Produce all required reports without exposing real secrets.

## Out of Scope

- Refactoring unrelated modules.
- Changing authentication or authorization architecture.
- Calling real Google, Jira, or AI services from tests.
- Replacing TypeORM or the database.
- Fixing unrelated documentation or route inconsistencies.
- Adding broad end-to-end coverage outside the settings scenario.

## Completion Criteria

The scenario is complete when:

- BUG-001 and BUG-002 meet all acceptance criteria.
- SEC-001 is removed and confirmed by the security verifier.
- Relevant generated unit tests pass.
- Existing project tests and the build remain successful.
- `verified-research.md`, `implementation-plan.md`, `fix-summary.md`,
  `security-report.md`, and `test-report.md` reference this scenario and real
  source locations.
