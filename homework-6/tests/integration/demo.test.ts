import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("demo.sh", () => {
  it("submits canonical and non-logical orders and cleans up the API process", async () => {
    const root = await mkdtemp(join(tmpdir(), "hw6-demo-test-"));
    temporaryDirectories.push(root);
    const fakeBin = join(root, "bin");
    const callsFile = join(root, "curl-calls.txt");
    const cleanupFile = join(root, "api-cleaned.txt");
    const healthCountFile = join(root, "health-count.txt");
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(fakeBin, { recursive: true }),
    );

    const fakeNode = join(fakeBin, "node");
    await writeFile(
      fakeNode,
      `#!/usr/bin/env bash
if [[ "\${1:-}" != "--import" ]]; then
  exec "${process.execPath}" "$@"
fi
trap 'printf cleaned > "${cleanupFile}"; exit 0' TERM INT
while true; do sleep 1; done
`,
      "utf8",
    );
    await chmod(fakeNode, 0o755);

    const fakeCurl = join(fakeBin, "curl");
    await writeFile(
      fakeCurl,
      `#!/usr/bin/env bash
printf '%s\n' "$*" >> "${callsFile}"
body=''
for argument in "$@"; do
  case "$argument" in
    @*) body="$(cat "\${argument#@}")"; printf '%s\n' "$body" >> "${callsFile}" ;;
  esac
done
case "$*" in
  *'/health'*)
    health_count=0
    if [[ -f "${healthCountFile}" ]]; then health_count="$(cat "${healthCountFile}")"; fi
    health_count=$((health_count + 1))
    printf '%s' "$health_count" > "${healthCountFile}"
    if [[ "$health_count" -eq 1 ]]; then exit 1; fi
    printf '{"status":"ok"}'
    ;;
  *'/transactions/TXN001'*) printf '{"transactionId":"TXN001","status":"rejected","reasonCodes":["PIPELINE_DEPENDENCY_MISSING"],"stageTrace":[]}' ;;
  *)
    case "$body" in
      *'fraud-detector","transaction-validator'*) printf '{"summary":{"total":8,"approved":0,"review":0,"rejected":8}}' ;;
      *) printf '{"summary":{"total":8,"approved":3,"review":3,"rejected":2}}' ;;
    esac
    ;;
esac
`,
      "utf8",
    );
    await chmod(fakeCurl, 0o755);

    const { stdout, stderr } = await execFileAsync(resolve("demo.sh"), [], {
      cwd: resolve("."),
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        PORT: "39001",
      },
      timeout: 10_000,
    });

    expect(stderr).toBe("");
    expect(stdout).toContain("Canonical order");
    expect(stdout).toContain("Non-logical order");
    expect(stdout).toContain('"approved":3');
    expect(stdout).toContain('"rejected":8');
    expect(stdout).toContain("PIPELINE_DEPENDENCY_MISSING");
    expect(stdout).not.toContain("ACC-001-1001");
    expect(stdout).not.toContain("salary payment");
    expect(await readFile(cleanupFile, "utf8")).toBe("cleaned");

    const calls = await readFile(callsFile, "utf8");
    expect(calls).toContain("/pipeline/run");
    expect(calls).toContain("/transactions/TXN001");
    expect(calls).toContain(
      'transaction-validator","fraud-detector","compliance-checker',
    );
    expect(calls).toContain(
      'fraud-detector","transaction-validator","compliance-checker',
    );
  });

  it("fails instead of using an unrelated healthy server on the configured port", async () => {
    const root = await mkdtemp(join(tmpdir(), "hw6-demo-collision-test-"));
    temporaryDirectories.push(root);
    const fakeBin = join(root, "bin");
    const callsFile = join(root, "curl-calls.txt");
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(fakeBin, { recursive: true }),
    );

    const fakeCurl = join(fakeBin, "curl");
    await writeFile(
      fakeCurl,
      `#!/usr/bin/env bash
printf '%s\n' "$*" >> "${callsFile}"
printf '{"status":"ok"}'
`,
      "utf8",
    );
    await chmod(fakeCurl, 0o755);

    const error = await execFileAsync(resolve("demo.sh"), [], {
      cwd: resolve("."),
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        PORT: "39002",
      },
      timeout: 10_000,
    }).then(
      () => undefined,
      (reason: unknown) => reason as { stderr: string },
    );

    expect(error).toBeDefined();
    expect(error?.stderr).toContain("API address is already in use.");
    expect(await readFile(callsFile, "utf8")).not.toContain("/pipeline/run");
  });
});
