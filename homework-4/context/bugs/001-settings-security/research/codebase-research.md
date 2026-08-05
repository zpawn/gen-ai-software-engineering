## Research Summary

- Status: PASS
- Scenario ID: `001-settings-security`. All three required issues (BUG-001, BUG-002, SEC-001) are reproducible from the current source in `src/settings/` and are fully supported by source evidence.
- BUG-001: Supported. `src/settings/dto/update-settings.dto.ts` declares `aiModel`, `aiProvider`, `aiFineTuning`, and `googleCalendars` as optional (`?`) TypeScript properties but omits `@IsOptional()` on their validators, so `class-validator` (invoked through the global `ValidationPipe` in `src/main.ts`) rejects requests that omit these fields.
- BUG-002: Supported. `SettingsService.updateUserSettings()` unconditionally calls all three group-update methods, and each method falls back to empty/default values (`updateDto.aiModel || ''`, `updateDto.googleCalendars || []`, `updateDto.jiraAuthType || JiraAuthType.BEARER`, etc.) whenever a field is omitted, overwriting existing stored data instead of preserving it.
- SEC-001: Supported. `SettingsService.mapToResponse()` copies `user.jiraSettings?.apiKey` directly into the response object, and `ResponseSettingsDto` declares a public `jira.apiKey: string` field that `getUserSettings()` returns verbatim to any authenticated caller.

## Scope Examined

- `context/bugs/001-settings-security/bug-context.md` (full file) — scenario definition, required issues, source leads, acceptance criteria.
- `src/settings/dto/update-settings.dto.ts:1-56` — full DTO; verified BUG-001 validator/optionality mismatches at lines 16-23, 29-31, and the correctly-annotated examples at 25-27 and 33-55.
- `src/settings/settings.service.ts:1-156` — full service; verified BUG-002 unconditional update calls at 32-35 and fallback-to-default logic at 92-99 (Google), 112-125 (AI), 136-151 (Jira); verified SEC-001 API-key mapping at 77-83 and response return path at 24-26.
- `src/settings/dto/response-settings.dto.ts:1-26` — verified SEC-001 public contract declaring `jira.apiKey: string` at lines 18-24.
- `src/settings/dto/index.ts:1-2` — confirms `UpdateSettingsDto`/`ResponseSettingsDto` are the exported DTOs used by the controller/service (context for all three issues).
- `src/settings/settings.controller.ts:1-24` — confirms `GET /settings` and `POST /settings` route to `getUserSettings`/`updateUserSettings`, matching the endpoints named in the bug context (routes are prefixed with `api/v2` via `main.ts:12`).
- `src/settings/settings.constants.ts:1-4` — defines `JiraAuthType` enum used as the default fallback in BUG-002/Jira mapping.
- `src/settings/entities/jira-settings.entity.ts:1-39`, `src/settings/entities/ai-settings.entity.ts:1-36`, `src/settings/entities/google-calendar-settings.entity.ts:1-23` — confirm entity columns are nullable with DB-level defaults (context for BUG-002's "documented defaults" acceptance criterion), showing the erase-on-omit behavior originates in the service layer, not the entity/column definitions.
- `src/main.ts:1-28` — confirms a global `ValidationPipe` (`whitelist: true`, `transform: true`) is applied to all requests, which is the mechanism that invokes the `class-validator` decorators referenced in BUG-001.
- Searched `test/` for existing settings tests (`Glob **/settings* under test/`) — no results found, confirming there is no pre-existing settings test suite to reconcile with.

## Claims

- **R-001** | BUG-001 | FACT | `aiModel?: string` is decorated only with `@IsString()` and has no `@IsOptional()` decorator. | `src/settings/dto/update-settings.dto.ts:16-17`
- **R-002** | BUG-001 | FACT | `aiProvider?: string` and `aiFineTuning?: string` are likewise decorated only with `@IsString()` with no `@IsOptional()`. | `src/settings/dto/update-settings.dto.ts:19-23`
- **R-003** | BUG-001 | FACT | `googleCalendars?: string[]` is decorated with `@IsArray()` and `@IsString({ each: true })` but has no `@IsOptional()`. | `src/settings/dto/update-settings.dto.ts:29-31`
- **R-004** | BUG-001 | FACT | Other optional properties in the same DTO (`aiSummaryLevel`, `jiraApiKey`, `jiraEmail`, `jiraIssueKey`, `jiraUrl`) correctly pair `@IsOptional()` with their type validators, showing the intended/working pattern that the fields in R-001–R-003 deviate from. | `src/settings/dto/update-settings.dto.ts:25-27`, `src/settings/dto/update-settings.dto.ts:33-55`
- **R-005** | BUG-001 | FACT | The application applies a global `ValidationPipe` with `transform: true` to all incoming requests, so `class-validator` decorators on `UpdateSettingsDto` are enforced on every `POST /api/v2/settings` request body. | `src/main.ts:12-19`
- **R-006** | BUG-001 | INFERENCE | Because `class-validator` runs each property's validators against the property value even when the property is `undefined`, and `@IsOptional()` is the mechanism that short-circuits validation for `undefined`/`null` values, omitting `@IsOptional()` on `aiModel`, `aiProvider`, `aiFineTuning`, and `googleCalendars` (R-001, R-002, R-003) causes `@IsString()`/`@IsArray()` to fail validation whenever those fields are absent from the request body, even though the TypeScript `?` marks them optional. | `src/settings/dto/update-settings.dto.ts:16-23`, `src/settings/dto/update-settings.dto.ts:29-31`
- **R-007** | BUG-002 | FACT | `updateUserSettings()` unconditionally invokes `updateAISettings`, `updateJiraSettings`, and `updateGoogleSettings` inside a single transaction for every update request, regardless of which fields the caller supplied. | `src/settings/settings.service.ts:32-35`
- **R-008** | BUG-002 | FACT | `updateGoogleSettings()` assigns `updateDto.googleCalendars || []` to `calendarIds` in both the create branch and the update branch. | `src/settings/settings.service.ts:92-99`
- **R-009** | BUG-002 | FACT | `updateAISettings()` assigns `updateDto.aiModel || ''`, `updateDto.aiProvider || ''`, `updateDto.aiFineTuning || ''`, and `updateDto.aiSummaryLevel || SummaryLevel.MEDIUM` in both the create and update branches. | `src/settings/settings.service.ts:112-125`
- **R-010** | BUG-002 | FACT | `updateJiraSettings()` assigns `updateDto.jiraApiKey || ''`, `updateDto.jiraAuthType || JiraAuthType.BEARER`, `updateDto.jiraEmail || ''`, `updateDto.jiraIssueKey || ''`, and `updateDto.jiraUrl || ''` in both the create and update branches. | `src/settings/settings.service.ts:136-151`
- **R-011** | BUG-002 | INFERENCE | Because `updateAISettings`, `updateJiraSettings`, and `updateGoogleSettings` (R-007) all run every request and each uses the `||` fallback pattern (R-008, R-009, R-010) on the *existing* entity in the `else` branch, sending an update that supplies only `jiraIssueKey` causes the AI and Google branches (and the untouched Jira fields) to overwrite existing non-empty stored values with empty strings/arrays/defaults, because `undefined` (an omitted field) is falsy and triggers the fallback exactly like an explicit empty value would. | `src/settings/settings.service.ts:32-35`, `src/settings/settings.service.ts:112-125`, `src/settings/settings.service.ts:136-151`
- **R-012** | BUG-002 | FACT | The Jira, AI, and Google settings entity columns are declared `nullable: true` (Jira/Google) or `nullable: true` for most AI fields, with DB-level `default` only on `authType` and `summaryLevel`; there is no service-level branch that skips a field or preserves the prior value when a DTO property is `undefined`. | `src/settings/entities/jira-settings.entity.ts:24-34`, `src/settings/entities/ai-settings.entity.ts:16-23`, `src/settings/entities/google-calendar-settings.entity.ts:15-16`
- **R-013** | SEC-001 | FACT | `mapToResponse()` sets `jira.apiKey: user.jiraSettings?.apiKey || ''` when building the response object returned from `getUserSettings()`. | `src/settings/settings.service.ts:77-83`
- **R-014** | SEC-001 | FACT | `ResponseSettingsDto` declares `apiKey: string` as part of the public `jira` response contract. | `src/settings/dto/response-settings.dto.ts:18-24`
- **R-015** | SEC-001 | FACT | `getUserSettings()` calls `findUserWithRelations()` then returns `this.mapToResponse(user)` directly, with no field removal or masking step before the response is returned to the controller. | `src/settings/settings.service.ts:24-26`
- **R-016** | SEC-001 | FACT | `SettingsController.getSettings()` returns the value of `settingsService.getUserSettings(user.sub)` directly to the HTTP response for `GET /settings` (mounted at `GET /api/v2/settings` via the global prefix in `src/main.ts:12`), with no interceptor or serialization step stripping fields. | `src/settings/settings.controller.ts:10-15`
- **R-017** | SEC-001 | INFERENCE | Because `mapToResponse()` includes the raw stored `apiKey` value (R-013), `ResponseSettingsDto` types that field as part of the public contract (R-014), and `getUserSettings()`/`getSettings()` return that object unmodified to the caller (R-015, R-016), any authenticated user who can call `GET /api/v2/settings` receives their stored Jira API key in plaintext in the JSON response. | `src/settings/settings.service.ts:77-83`, `src/settings/settings.service.ts:24-26`, `src/settings/settings.controller.ts:10-15`

## Root Cause Analysis

### BUG-001: Optional Settings Fields Fail Validation When Omitted

- Execution path: `POST /api/v2/settings` body → global `ValidationPipe` (`src/main.ts:13-19`) instantiates and validates `UpdateSettingsDto` using `class-validator` decorators → `SettingsController.updateSettings()` (`src/settings/settings.controller.ts:17-23`) only receives the body if validation passes.
- Actual behavior: A request that omits `aiModel`, `aiProvider`, `aiFineTuning`, or `googleCalendars` fails validation, because `@IsString()`/`@IsArray()`/`@IsString({ each: true })` on these properties run against `undefined` and reject it.
- Expected behavior: Because these properties are typed as optional (`?`) in `UpdateSettingsDto`, requests omitting them should pass validation; when present, the same type/format validators should still apply.
- Root cause: The four properties lack the `@IsOptional()` decorator that every other optional property in the same DTO uses (compare R-001/R-002/R-003 to R-004). Without `@IsOptional()`, `class-validator` does not skip validation for `undefined` values, so the type validators reject the omission itself rather than only rejecting wrong-typed provided values.
- Linked claims: R-001, R-002, R-003, R-004, R-005, R-006.

### BUG-002: Partial Update Erases Existing Settings

- Execution path: `POST /api/v2/settings` → `SettingsController.updateSettings()` → `SettingsService.updateUserSettings()` → transaction runs `updateAISettings`, `updateJiraSettings`, `updateGoogleSettings` unconditionally → each method reads the (possibly `undefined`) field from `updateDto` and assigns `field || <fallback>` onto the existing or new entity → `transactionEM.save(...)` persists the result.
- Actual behavior: Sending an update with only `jiraIssueKey` set still runs all three group-update methods; each omitted property (`aiModel`, `aiProvider`, `aiFineTuning`, `aiSummaryLevel`, `googleCalendars`, `jiraApiKey`, `jiraAuthType`, `jiraEmail`, `jiraUrl`) is `undefined`, and the `|| fallback` pattern in the `else` branch of each method overwrites the *existing* entity's stored value with an empty string, empty array, or default enum value.
- Expected behavior: Omitted properties should leave the corresponding stored column unchanged; only properties explicitly present in the request body should be written.
- Root cause: There is no per-field presence check (e.g., `'aiModel' in updateDto` or `updateDto.aiModel !== undefined`) before assignment in `updateAISettings`, `updateJiraSettings`, or `updateGoogleSettings`. The `||` fallback conflates "field omitted" with "field explicitly empty," and because all three update methods run on every request regardless of which DTO keys were sent, any single-field update clobbers the other two groups and the other fields within the touched group.
- Linked claims: R-007, R-008, R-009, R-010, R-011, R-012.

### SEC-001: Jira API Key Is Returned in the Settings Response

- Execution path: `GET /api/v2/settings` → `SettingsController.getSettings()` → `SettingsService.getUserSettings()` → `findUserWithRelations()` loads `user.jiraSettings` (including `apiKey`) → `mapToResponse()` builds and returns the response object → controller returns it as the JSON response body.
- Actual behavior: The response's `jira.apiKey` field contains the plaintext stored Jira API key for any authenticated caller of the endpoint.
- Expected behavior: The API should never return the stored Jira credential; at most it may expose a non-sensitive boolean indicating whether a credential is configured.
- Root cause: `mapToResponse()` explicitly copies `user.jiraSettings?.apiKey` into the returned object (R-013), and the `ResponseSettingsDto` type contract explicitly declares `apiKey: string` as part of the public shape (R-014), so there is no point in the read path — `getUserSettings()` or the controller — where the credential is stripped or replaced with a safe indicator before the response leaves the service (R-015, R-016).
- Linked claims: R-013, R-014, R-015, R-016, R-017.

## Evidence

**R-001, R-006**
```ts
@IsString()
aiModel?: string;
```
`src/settings/dto/update-settings.dto.ts:16-17`

**R-002, R-006**
```ts
@IsString()
aiProvider?: string;

@IsString()
aiFineTuning?: string;
```
`src/settings/dto/update-settings.dto.ts:19-23`

**R-003, R-006**
```ts
@IsArray()
@IsString({ each: true })
googleCalendars?: string[];
```
`src/settings/dto/update-settings.dto.ts:29-31`

**R-004**
```ts
@IsOptional()
@IsEnum(SummaryLevel)
aiSummaryLevel?: SummaryLevel;
```
`src/settings/dto/update-settings.dto.ts:25-27`

**R-005**
```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // remove all fields that are not in the DTO
    forbidNonWhitelisted: false, // throw an error if there is a non-whitelisted field
    transform: true, // transform the data to the type of the DTO
  }),
);
```
`src/main.ts:13-19`

**R-007, R-011**
```ts
await this.userRepository.manager.transaction(async (transactionEM) => {
  await this.updateAISettings(transactionEM, user, updateDto);
  await this.updateJiraSettings(transactionEM, user, updateDto);
  await this.updateGoogleSettings(transactionEM, user, updateDto);
```
`src/settings/settings.service.ts:32-35`

**R-008, R-011**
```ts
if (!user.googleCalendarSettings) {
  user.googleCalendarSettings = this.googleSettingsRepository.create({
    calendarIds: updateDto.googleCalendars || [],
    user: { id: user.id },
  });
} else {
  user.googleCalendarSettings.calendarIds = updateDto.googleCalendars || [];
}
```
`src/settings/settings.service.ts:92-99`

**R-009, R-011**
```ts
if (!user.aiSettings) {
  user.aiSettings = this.aiSettingsRepository.create({
    llm: updateDto.aiModel || '',
    provider: updateDto.aiProvider || '',
    fineTuning: updateDto.aiFineTuning || '',
    summaryLevel: updateDto.aiSummaryLevel || SummaryLevel.MEDIUM,
    user: { id: user.id },
  });
} else {
  user.aiSettings.llm = updateDto.aiModel || '';
  user.aiSettings.provider = updateDto.aiProvider || '';
  user.aiSettings.fineTuning = updateDto.aiFineTuning || '';
  user.aiSettings.summaryLevel =
    updateDto.aiSummaryLevel || SummaryLevel.MEDIUM;
```
`src/settings/settings.service.ts:112-125`

**R-010, R-011**
```ts
if (!user.jiraSettings) {
  user.jiraSettings = this.jiraSettingsRepository.create({
    apiKey: updateDto.jiraApiKey || '',
    authType: updateDto.jiraAuthType || JiraAuthType.BEARER,
    email: updateDto.jiraEmail || '',
    issueKey: updateDto.jiraIssueKey || '',
    url: updateDto.jiraUrl || '',
    user: { id: user.id },
  });
} else {
  user.jiraSettings.apiKey = updateDto.jiraApiKey || '';
  user.jiraSettings.authType =
    updateDto.jiraAuthType || JiraAuthType.BEARER;
  user.jiraSettings.email = updateDto.jiraEmail || '';
  user.jiraSettings.issueKey = updateDto.jiraIssueKey || '';
```
`src/settings/settings.service.ts:136-151`

**R-012**
```ts
@Column({ nullable: true })
apiKey: string;
```
`src/settings/entities/jira-settings.entity.ts:24-28` (equivalent nullable pattern also at `src/settings/entities/ai-settings.entity.ts:16-23` and `src/settings/entities/google-calendar-settings.entity.ts:15-16`)

**R-013, R-017**
```ts
jira: {
  url: user.jiraSettings?.url || '',
  issueKey: user.jiraSettings?.issueKey || '',
  authType: user.jiraSettings?.authType || JiraAuthType.BEARER,
  email: user.jiraSettings?.email || '',
  apiKey: user.jiraSettings?.apiKey || '',
},
```
`src/settings/settings.service.ts:77-83`

**R-014**
```ts
jira: {
  url: string;
  issueKey: string;
  authType: JiraAuthType.BEARER | JiraAuthType.BASIC;
  email: string;
  apiKey: string;
};
```
`src/settings/dto/response-settings.dto.ts:18-24`

**R-015, R-017**
```ts
async getUserSettings(userId: User['id']): Promise<ResponseSettingsDto> {
  const user = await this.findUserWithRelations(userId);
  return this.mapToResponse(user);
}
```
`src/settings/settings.service.ts:24-26`

**R-016, R-017**
```ts
@Get()
getSettings(
  @ActiveUser() user: ActiveUserData,
): Promise<ResponseSettingsDto> {
  return this.settingsService.getUserSettings(user.sub);
}
```
`src/settings/settings.controller.ts:10-15`

## References

- `context/bugs/001-settings-security/bug-context.md` — scenario definition, required issue IDs, acceptance criteria, and out-of-scope constraints.
- `src/settings/dto/update-settings.dto.ts` — BUG-001 source: optional-field validator/`@IsOptional()` mismatches and correctly-annotated counterexamples.
- `src/settings/settings.service.ts` — BUG-002 source: unconditional group updates and fallback-to-default assignment logic; SEC-001 source: `mapToResponse()` and `getUserSettings()`.
- `src/settings/dto/response-settings.dto.ts` — SEC-001 source: public response contract declaring `jira.apiKey`.
- `src/settings/dto/index.ts` — confirms exported DTO names used across controller/service.
- `src/settings/settings.controller.ts` — confirms route handlers for `GET/POST /settings` and unmodified pass-through of the service response (SEC-001 context).
- `src/settings/settings.constants.ts` — defines `JiraAuthType` enum used as a fallback default in BUG-002.
- `src/settings/entities/jira-settings.entity.ts` — column nullability/defaults for Jira settings (BUG-002 context).
- `src/settings/entities/ai-settings.entity.ts` — column nullability/defaults for AI settings (BUG-002 context).
- `src/settings/entities/google-calendar-settings.entity.ts` — column nullability/defaults for Google calendar settings (BUG-002 context).
- `src/main.ts` — confirms the global `ValidationPipe` configuration that enforces `class-validator` decorators (BUG-001 context) and the `api/v2` route prefix referenced in the bug context's endpoint paths.
