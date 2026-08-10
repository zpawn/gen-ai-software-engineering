# Design Task 3: Claude commands and coverage hook

## Goal

Complete the minimum necessary infrastructure Task 3 without creating screenshots: unify the names of the commands created in the Claude project with the prefix `hw6-` and confirm that the coverage hook blocks `git push` when `npm run test:coverage` terminates with an error.

## Scope of changes

- Leave the existing command `.claude/commands/hw6-run-pipeline.md` without changing the behavior.
- Rename `.claude/commands/validate-transactions.md` to `.claude/commands/hw6-validate-transactions.md`.
- Rename `.claude/commands/write-spec.md` to `.claude/commands/hw6-write-spec.md`.
- Update references to old team names in project documentation.
- Do not add automated tests for shell hook within the minimum version.
- Do not create screenshots: the student will make them during the final stage.

## Coverage gate

The existing `.claude/hooks/coverage-gate.sh` remains the push blocking mechanism. Hook should:

1. Ignore Bash commands that do not contain `git push`.
2. Run `npm run test:coverage` before `git push`.
3. End with a non-zero code and block push if tests or coverage threshold are not passed.
4. Allow push only after a successful coverage run.

The threshold is set in `vitest.config.ts` and must not be lower than the mandatory 80%. Validation is done manually with no real push: the hook receives the test JSON via stdin.

## Verification

- Check the absence of own Claude commands without the `hw6-` prefix.
- Run a hook with a secure non-push command and check the code `0`.
- Run hook with test value `git push`; it should execute the current `npm run test:coverage` and complete successfully under the current coverage.
- Check `npm run typecheck`.
- Do not execute `git add`, `git commit` or genuine `git push`.

## Out of scope

- Automated unit tests of the shell hook itself.
- Deliberate reduction of coverage to demonstrate blocking.
- Screenshots of `skill-run-pipeline.png` and `hook-trigger.png`.
- Changes to the TypeScript pipeline or business logic.
