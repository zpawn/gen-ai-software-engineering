import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createAuditEntry } from "../../src/infrastructure/audit-logger.js";
import {
  clearPipelineDirectories,
  createPipelineDirectories,
  moveStageFile,
  readJson,
  writeJsonAtomic,
} from "../../src/infrastructure/file-store.js";

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "hw6-file-store-"));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("pipeline file store", () => {
  it("creates each known pipeline directory under the configured root", async () => {
    const root = await createTemporaryDirectory();

    await createPipelineDirectories(root);

    await expect(readdir(join(root, "input"))).resolves.toEqual([]);
    await expect(readdir(join(root, "processing"))).resolves.toEqual([]);
    await expect(readdir(join(root, "output"))).resolves.toEqual([]);
    await expect(readdir(join(root, "results"))).resolves.toEqual([]);
  });

  it("clears only known pipeline directories while preserving unknown siblings", async () => {
    const root = await createTemporaryDirectory();
    await createPipelineDirectories(root);
    await Promise.all([
      writeFile(join(root, "input", "message.json"), "input"),
      writeFile(join(root, "processing", "message.json"), "processing"),
      writeFile(join(root, "output", "message.json"), "output"),
      writeFile(join(root, "results", "result.json"), "result"),
      mkdir(join(root, "custom-data")),
      writeFile(join(root, "keep-me.txt"), "keep"),
    ]);
    await writeFile(join(root, "custom-data", "important.txt"), "important");

    await clearPipelineDirectories(root);

    await expect(readdir(join(root, "input"))).resolves.toEqual([]);
    await expect(readdir(join(root, "processing"))).resolves.toEqual([]);
    await expect(readdir(join(root, "output"))).resolves.toEqual([]);
    await expect(readdir(join(root, "results"))).resolves.toEqual([]);
    await expect(readFile(join(root, "keep-me.txt"), "utf8")).resolves.toBe("keep");
    await expect(
      readFile(join(root, "custom-data", "important.txt"), "utf8"),
    ).resolves.toBe("important");
  });

  it("publishes an atomic JSON write as only the requested final filename", async () => {
    const root = await createTemporaryDirectory();
    const resultsDirectory = join(root, "results");
    const resultPath = join(resultsDirectory, "TXN-ATOMIC-001.json");
    await mkdir(resultsDirectory);

    await writeJsonAtomic(resultPath, { status: "approved" });

    await expect(readdir(resultsDirectory)).resolves.toEqual(["TXN-ATOMIC-001.json"]);
    await expect(readFile(resultPath, "utf8")).resolves.toBe(
      '{\n  "status": "approved"\n}\n',
    );
  });

  it("reads the JSON value that was stored at a path", async () => {
    const root = await createTemporaryDirectory();
    const filePath = join(root, "value.json");
    await writeFile(filePath, '{"stage":"processing"}');

    await expect(readJson(filePath)).resolves.toEqual({ stage: "processing" });
  });

  it("moves a stage file only after writing the next stage value", async () => {
    const root = await createTemporaryDirectory();
    const sourcePath = join(root, "input.json");
    const destinationPath = join(root, "output", "result.json");
    await writeFile(sourcePath, "source");
    await mkdir(join(root, "output"));

    await moveStageFile(sourcePath, destinationPath, { stage: "output" });

    await expect(readJson(destinationPath)).resolves.toEqual({ stage: "output" });
    await expect(readFile(sourcePath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

describe("audit logger", () => {
  it("creates an entry with only audit-safe fields", () => {
    const unsafeInput = {
      agentName: "transaction-validator",
      transactionId: "TXN-AUDIT-001",
      outcome: "rejected",
      reasonCodes: ["INVALID_AMOUNT"],
      now: () => "2026-08-10T10:00:00.000Z",
      sourceAccount: "PRIVATE-SOURCE-ACCOUNT",
      destinationAccount: "PRIVATE-DESTINATION-ACCOUNT",
      description: "Private transaction description",
    };

    const entry = createAuditEntry(unsafeInput);

    expect(entry).toEqual({
      timestamp: "2026-08-10T10:00:00.000Z",
      agent_name: "transaction-validator",
      transaction_id: "TXN-AUDIT-001",
      outcome: "rejected",
      reason_codes: ["INVALID_AMOUNT"],
    });
    expect(JSON.stringify(entry)).not.toContain("PRIVATE-SOURCE-ACCOUNT");
    expect(JSON.stringify(entry)).not.toContain("PRIVATE-DESTINATION-ACCOUNT");
    expect(JSON.stringify(entry)).not.toContain("Private transaction description");
  });

  it("keeps an audit entry's reason codes isolated from later caller mutations", () => {
    const reasonCodes = ["INITIAL_REASON"];
    const entry = createAuditEntry({
      agentName: "transaction-validator",
      transactionId: "TXN-AUDIT-002",
      outcome: "rejected",
      reasonCodes,
      now: () => "2026-08-10T10:00:00.000Z",
    });

    reasonCodes.push("CALLER_MUTATION");
    entry.reason_codes.push("ENTRY_MUTATION");

    expect(entry.reason_codes).toEqual(["INITIAL_REASON", "ENTRY_MUTATION"]);
    expect(reasonCodes).toEqual(["INITIAL_REASON", "CALLER_MUTATION"]);
  });
});
