---
description: Run the pipeline end to end and show only a safe summary and reason codes for rejected transactions.
allowed-tools: Read, Grep, Glob, Bash(npm run pipeline), Bash(node *), Bash(git status *)
---

Run the multi-agent banking pipeline end to end with `/hw6-run-pipeline`.

Use this workflow:

1. Read `AGENTS.md`, `README.md`, `docs/specification.md`, and `HOWTORUN.md` if it exists.
2. Check that `sample-transactions.json` exists and is a valid JSON array.
3. Check `package.json` and the npm script `pipeline`.
   - If `package.json` or the script is missing, stop and clearly report that the pipeline is not implemented.
   - Do not create results or claim a successful run.
4. Run the application workflow:

```bash
npm run pipeline
```

5. Check that every `transaction_id` in `sample-transactions.json` has one final result in `shared/results/`.
6. Read only `total`, `approved`, `review`, and `rejected` from `shared/results/summary.json`.
7. For rejected results, read and show only `transactionId` and `reasonCodes`.
   - Never show account numbers, names, descriptions, raw payloads, audit details, or other PII.
8. If the command fails, results are incomplete, or the summary is missing, report the actual safe error; do not call the run successful.
9. Do not run `git add` or `git commit`.
