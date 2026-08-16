---
description: Ask for the order of all three pipeline steps, submit sample transactions through REST, and show safe results.
allowed-tools: Read, Grep, Glob, Bash(curl *), Bash(npm run api), Bash(node *), Bash(kill *), Bash(wait *), Bash(git status *)
---

Configure and run the Homework 6 file-based pipeline through its REST gateway.

1. Read `AGENTS.md`, `README.md`, `HOWTORUN.md`, and `sample-transactions.json`.
2. Ask the user for the order of these three TypeScript pipeline agents:
   - `transaction-validator`
   - `fraud-detector`
   - `compliance-checker`
3. Accept only an order that contains all three names exactly once. If it is invalid, explain the problem and ask again. Do not change business rules.
4. Confirm that the local API responds at `GET /health`. If it is not running, use one Bash invocation that starts `npm run api` in the background, captures `$!`, installs a cleanup trap, waits for health, submits the request, reads results, and stops only that captured PID.
5. Send one `POST /pipeline/run` request whose `steps` are the confirmed order and whose `transactions` are the JSON array from `sample-transactions.json`.
6. Report only:
   - `total`, `approved`, `review`, and `rejected`;
   - transaction IDs and statuses;
   - safe `reasonCodes` and `stageTrace` values.
7. Never show account IDs, names, descriptions, raw transactions, full audit trails, or other PII.
8. If the order is non-logical, clearly explain which steps were skipped and which dependency was missing. Do not call a rejected dependency run a system failure.
9. Stop any API process started by this command. Do not stop a server that was already running.
10. Do not run `git add` or `git commit`.
