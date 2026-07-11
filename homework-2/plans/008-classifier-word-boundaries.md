# Plan 008: Classifier matches whole words/phrases, not substrings

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/ticket.classifier.ts homework-2/backend/tests/test_categorization.test.ts`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

Keyword matching uses raw substring `includes`, so `add` (a `feature_request` keyword) matches inside "address", "additional", "padding"; `error` and `server` match inside unrelated words. Rules are evaluated first-match-wins, so an early false positive short-circuits the correct category — e.g. a billing ticket mentioning a "billing address" can classify as `feature_request` if worded to hit `add` first. Misclassification also poisons the stored `keywords_found` and confidence values.

## Current state

`homework-2/backend/src/modules/tickets/ticket.classifier.ts` (102 lines total):

```ts
// line 62-64
const text = `${input.subject} ${input.description}`.toLowerCase();
const categoryMatch = this.firstRuleMatch(CATEGORY_RULES, text);
const priorityMatch = this.firstRuleMatch(PRIORITY_RULES, text);

// lines 83-95
private firstRuleMatch<T>(rules, text): { rule; keywords } | undefined {
  for (const rule of rules) {
    const keywords = rule.keywords.filter((keyword) => text.includes(keyword));  // ← substring match
    if (keywords.length > 0) return { rule, keywords };
  }
  return undefined;
}
```

Keyword tables (lines 9–53) include multi-word phrases (`'cannot access'`, `"can't access"`, `'steps to reproduce'`, `'production down'`, `'two-factor'`, `'2fa'`) and short words prone to false positives (`'add'` line 32, `'error'`, `'server'` line 27, `'request'` line 32). Confidence formula (lines 97-100): `0.45 + categoryMatches * 0.15 + priorityMatches * 0.1`, capped 0.95.

Behavior pinned by tests: `homework-2/backend/tests/test_categorization.test.ts` — read it fully before changing anything; its fixtures define the expected category/priority per sample text.

Design constraint from the wiki (`homework-2/wiki/` documents a rule-based classifier as the intended design): stay rule-based — do NOT introduce ML/LLM calls.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Tests | `npm test` | all pass |
| Just classifier tests | `npm --workspace backend test -- test_categorization` | all pass |

## Scope

**In scope**:
- `homework-2/backend/src/modules/tickets/ticket.classifier.ts`
- `homework-2/backend/tests/test_categorization.test.ts` (new cases; existing expectations may be updated ONLY where the old expectation encoded a substring false positive — list each such change in your report)
- `plans/README.md` (status row)

**Out of scope**:
- The keyword tables' contents (adding/removing keywords is tuning, not this fix) — exception: none.
- First-match-wins rule ordering and the confidence formula — changing scoring semantics is a product decision; keep both.
- `ticket.service.ts` — the classify call site is untouched.

## Git workflow

- Branch: current or `advisor/008-classifier-boundaries`.
- Commit: `fix(homework-2): word-boundary keyword matching in classifier`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Precompile boundary-anchored regexes per keyword

At module scope, build the regexes once (not per classify call). A keyword matches when it appears as a whole word/phrase — bounded by string edges or non-alphanumeric characters. Note `\b` alone mishandles keywords with non-word edge characters (`"can't access"`, `'2fa'`, `'two-factor'`), so anchor manually:

```ts
function keywordRegex(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
}

interface CompiledRule<T> { value: T; reasoning: string; keywords: { keyword: string; regex: RegExp }[] }
const COMPILED_CATEGORY_RULES: CompiledRule<TicketCategory>[] = CATEGORY_RULES.map(...);
const COMPILED_PRIORITY_RULES: CompiledRule<TicketPriority>[] = PRIORITY_RULES.map(...);
```

(`(?<![a-z0-9])` lookbehind is supported by the Node versions in use.)

### Step 2: Use them in `firstRuleMatch`

```ts
const keywords = rule.keywords.filter(({ regex }) => regex.test(text)).map(({ keyword }) => keyword);
```

Keep the returned `keywords` as plain strings so `keywords_found` output is unchanged in shape. Keep first-match-wins and the confidence formula exactly as they are.

**Verify**: `npm --workspace backend run build` → exit 0.

### Step 3: Tests

Run the existing suite first: `npm --workspace backend test -- test_categorization`. Triage failures: a failure is legitimate only if the old expectation depended on a substring false positive (e.g. a fixture relying on `add` inside another word). Update only those, and list each in your report with the before/after category.

Then add new cases to `test_categorization.test.ts` (pattern: existing tests there, using the classifier or the API):

1. Subject/description "Please update my billing address" → category is `billing_question`, NOT `feature_request` (guards `add` false positive; "billing" matches as a whole word).
2. Description containing "additional information about my invoice" → NOT `feature_request`.
3. "can't access my account" → `account_access` with priority `urgent` (guards phrase matching with apostrophe).
4. "steps to reproduce: click save" → `bug_report` (guards multi-word phrase).
5. "2FA code never arrives" → `account_access` (guards numeric-edge keyword).

**Verify**: `npm test` → all pass.

## Test plan

Covered in Step 3. Run: `npm test` and `npm run test:coverage` (thresholds must stay met).

## Done criteria

- [ ] `grep -n 'text.includes' backend/src/modules/tickets/ticket.classifier.ts` → no match
- [ ] `npm --workspace backend run build` exits 0
- [ ] `npm test` exits 0 with the 5 new cases
- [ ] Report lists every changed pre-existing expectation (may be zero)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- More than 3 existing test expectations fail after the change — the substring behavior is more load-bearing than assessed; report the failures instead of rewriting the suite.
- Lookbehind syntax fails on the project's Node version (SyntaxError at load) — pivot to a token-set approach for single-word keywords + `includes` with manual edge checks for phrases; STOP if that also fails tests twice.
- Fixture data in `backend/data/` or seed expectations (`src/db/seed.ts`) turn out to depend on old classifications — report, don't edit seeds.

## Maintenance notes

- Keyword-table tuning (e.g. dropping `'request'`, adding domain phrases) is now safe to do independently — deliberately out of scope here.
- Reviewer: check that `keywords_found` in classification-log responses still contains the human-readable keyword strings, not regex sources.
- If scoring ever moves from first-match-wins to weighted scoring across all rules, the compiled-rule structure from Step 1 is the right substrate.
