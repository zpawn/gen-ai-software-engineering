---
description: Validate sample transactions in dry-run mode without fraud and compliance stages.
allowed-tools: Read, Grep, Glob, Bash(npm run validate:dry), Bash(node *)
---

Validate all records from `sample-transactions.json` with `/hw6-validate-transactions` without running the full pipeline.

Workflow:

1. Read `AGENTS.md` and validation requirements in `docs/specification.md`.
2. Check that `sample-transactions.json` exists and is a valid JSON array.
3. Check `package.json` and the npm script `validate:dry`.
   - If the script is missing, stop and report that the dry-run validator is not implemented.
   - Do not create output manually or claim successful validation.
4. Run:

```bash
npm run validate:dry
```

5. Show:
   - total count;
   - valid count;
   - invalid count;
   - reason codes for each invalid transaction.
6. Show a table with `transaction_id`, `status`, and `reasons` columns.
7. Do not run the fraud detector or compliance checker, and do not change `shared/results/`.
8. Do not show account numbers, descriptions, or other PII.
9. Do not run `git add` or `git commit`.
