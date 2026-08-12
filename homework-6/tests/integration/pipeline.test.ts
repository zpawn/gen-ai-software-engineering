import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as complianceChecker from "../../src/agents/compliance-checker.js";
import * as fraudDetector from "../../src/agents/fraud-detector.js";
import type { PipelineConfig } from "../../src/config/pipeline-config.js";
import { runPipeline, type PipelineOptions } from "../../src/integrator.js";
import { readTransactionResult } from "../../src/infrastructure/results-repository.js";

const fileStoreControl = vi.hoisted(() => ({
  writeFailureActive: false,
  writes: [] as Array<{ filePath: string; value: unknown }>,
}));

vi.mock("../../src/agents/compliance-checker.js", { spy: true });
vi.mock("../../src/agents/fraud-detector.js", { spy: true });

vi.mock("../../src/infrastructure/file-store.js", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../src/infrastructure/file-store.js")
  >();

  return {
    ...actual,
    moveStageFile: async (
      ...args: Parameters<typeof actual.moveStageFile>
    ): Promise<void> => {
      fileStoreControl.writes.push({ filePath: args[1], value: args[2] });
      await actual.moveStageFile(...args);
    },
    writeJsonAtomic: async (
      ...args: Parameters<typeof actual.writeJsonAtomic>
    ): Promise<void> => {
      if (fileStoreControl.writeFailureActive) {
        throw new Error("INJECTED_WRITE_FAILURE_PRIVATE_ACCOUNT_9001");
      }

      fileStoreControl.writes.push({ filePath: args[0], value: args[1] });
      await actual.writeJsonAtomic(...args);
    },
  };
});

const temporaryDirectories: string[] = [];

const config: PipelineConfig = {
  supportedCurrencies: new Set(["USD", "EUR", "GBP", "JPY"]),
  domesticCountry: "US",
  highValueThreshold: "10000.00",
  unusualHourStart: 0,
  unusualHourEnd: 4,
  highValueWeight: 50,
  unusualTimeWeight: 25,
  crossBorderWeight: 25,
  reviewThreshold: 50,
};

const transaction = (overrides: Record<string, unknown> = {}) => ({
  transaction_id: "TXN-APPROVED",
  timestamp: "2026-08-10T09:00:00Z",
  source_account: "PRIVATE-SOURCE-ACCOUNT-9001",
  destination_account: "PRIVATE-DESTINATION-ACCOUNT-9002",
  amount: "125.00",
  currency: "USD",
  transaction_type: "transfer",
  description: "Private payment description that must never be serialized",
  metadata: {
    channel: "online",
    country: "US",
  },
  ...overrides,
});

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "hw6-pipeline-"));
  temporaryDirectories.push(directory);
  return directory;
};

const writeInput = async (
  root: string,
  contents: unknown,
): Promise<string> => {
  const inputFile = join(root, "sample-transactions.json");
  await writeFile(inputFile, JSON.stringify(contents), "utf8");
  return inputFile;
};

const optionsFor = (inputFile: string, sharedRoot: string): PipelineOptions => ({
  inputFile,
  sharedRoot,
  config,
  now: () => "2026-08-10T12:00:00.000Z",
});

const systemErrorFrom = async (
  operation: Promise<unknown>,
): Promise<{ code?: unknown; message: string }> =>
  operation.then(
    () => {
      throw new Error("Expected a controlled pipeline system error.");
    },
    (error: unknown) => error as { code?: unknown; message: string },
  );

afterEach(async () => {
  fileStoreControl.writeFailureActive = false;
  fileStoreControl.writes.splice(0);
  vi.clearAllMocks();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("runPipeline", () => {
  it("orchestrates every record sequentially and persists only safe final outcomes", async () => {
    const root = await createTemporaryDirectory();
    const sharedRoot = join(root, "shared");
    const inputFile = await writeInput(root, [
      transaction({ transaction_id: "TXN-APPROVED" }),
      transaction({ transaction_id: "TXN-REVIEW", amount: "10000.01" }),
      transaction({ transaction_id: "TXN-INVALID-CURRENCY", currency: "XYZ" }),
      transaction({ transaction_id: "TXN-NEGATIVE", amount: "-1.00" }),
    ]);
    const createdMessageIds: string[] = [];
    let nowCallCount = 0;

    const summary = await runPipeline({
      ...optionsFor(inputFile, sharedRoot),
      now: () => {
        nowCallCount += 1;
        return "2026-08-10T12:00:00.000Z";
      },
      createMessageId: () => {
        const messageId = `message-${createdMessageIds.length + 1}`;
        createdMessageIds.push(messageId);
        return messageId;
      },
    });

    expect(summary).toEqual({ total: 4, approved: 1, review: 1, rejected: 2 });
    expect(createdMessageIds).toEqual([
      "message-1",
      "message-2",
      "message-3",
      "message-4",
      "message-5",
      "message-6",
      "message-7",
      "message-8",
    ]);
    expect(nowCallCount).toBeGreaterThanOrEqual(createdMessageIds.length);
    expect(fraudDetector.assessFraudRisk).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(fraudDetector.assessFraudRisk).mock.calls.map(
        ([transaction]) => transaction.transactionId,
      ),
    ).toEqual(["TXN-APPROVED", "TXN-REVIEW"]);
    expect(complianceChecker.checkCompliance).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(complianceChecker.checkCompliance).mock.calls.map(
        ([transaction]) => transaction.transactionId,
      ),
    ).toEqual(["TXN-APPROVED", "TXN-REVIEW"]);
    const stageEnvelopes = fileStoreControl.writes
      .filter(({ value }) =>
        typeof value === "object" &&
        value !== null &&
        "message_id" in value &&
        "timestamp" in value &&
        "source_agent" in value &&
        "target_agent" in value,
      )
      .map(({ filePath, value }) => {
        const message = value as {
          message_id: string;
          timestamp: string;
          source_agent: string;
          target_agent: string;
        };

        return {
          path: relative(sharedRoot, filePath),
          messageId: message.message_id,
          timestamp: message.timestamp,
          sourceAgent: message.source_agent,
          targetAgent: message.target_agent,
        };
      });
    expect(stageEnvelopes).toEqual([
      {
        path: "input/record-0.json",
        messageId: "message-1",
        timestamp: "2026-08-10T12:00:00.000Z",
        sourceAgent: "integrator",
        targetAgent: "transaction-validator",
      },
      {
        path: "processing/record-0.json",
        messageId: "message-2",
        timestamp: "2026-08-10T12:00:00.000Z",
        sourceAgent: "transaction-validator",
        targetAgent: "fraud-detector",
      },
      {
        path: "output/record-0.json",
        messageId: "message-3",
        timestamp: "2026-08-10T12:00:00.000Z",
        sourceAgent: "fraud-detector",
        targetAgent: "compliance-checker",
      },
      {
        path: "input/record-1.json",
        messageId: "message-4",
        timestamp: "2026-08-10T12:00:00.000Z",
        sourceAgent: "integrator",
        targetAgent: "transaction-validator",
      },
      {
        path: "processing/record-1.json",
        messageId: "message-5",
        timestamp: "2026-08-10T12:00:00.000Z",
        sourceAgent: "transaction-validator",
        targetAgent: "fraud-detector",
      },
      {
        path: "output/record-1.json",
        messageId: "message-6",
        timestamp: "2026-08-10T12:00:00.000Z",
        sourceAgent: "fraud-detector",
        targetAgent: "compliance-checker",
      },
      {
        path: "input/record-2.json",
        messageId: "message-7",
        timestamp: "2026-08-10T12:00:00.000Z",
        sourceAgent: "integrator",
        targetAgent: "transaction-validator",
      },
      {
        path: "input/record-3.json",
        messageId: "message-8",
        timestamp: "2026-08-10T12:00:00.000Z",
        sourceAgent: "integrator",
        targetAgent: "transaction-validator",
      },
    ]);

    const resultsDirectory = join(sharedRoot, "results");
    const resultFileNames = (await readdir(resultsDirectory))
      .filter((fileName) => fileName !== "summary.json")
      .sort();
    expect(resultFileNames).toEqual([
      "TXN-APPROVED.json",
      "TXN-INVALID-CURRENCY.json",
      "TXN-NEGATIVE.json",
      "TXN-REVIEW.json",
    ]);

    const serializedResults = await Promise.all(
      resultFileNames.map((fileName) => readFile(join(resultsDirectory, fileName), "utf8")),
    );
    expect(serializedResults.join("\n")).not.toContain("PRIVATE-SOURCE-ACCOUNT-9001");
    expect(serializedResults.join("\n")).not.toContain(
      "PRIVATE-DESTINATION-ACCOUNT-9002",
    );
    expect(serializedResults.join("\n")).not.toContain(
      "Private payment description that must never be serialized",
    );
    expect(JSON.parse(serializedResults[0] ?? "{}")).toMatchObject({
      transactionId: "TXN-APPROVED",
      status: "approved",
      riskScore: 0,
      riskFlags: [],
      auditTrail: [
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "transaction-validator",
          transaction_id: "TXN-APPROVED",
          outcome: "validated",
          reason_codes: [],
        },
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "fraud-detector",
          transaction_id: "TXN-APPROVED",
          outcome: "assessed",
          reason_codes: [],
        },
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "compliance-checker",
          transaction_id: "TXN-APPROVED",
          outcome: "approved",
          reason_codes: ["RISK_SCORE_BELOW_REVIEW_THRESHOLD"],
        },
      ],
    });
    expect(JSON.parse(serializedResults[1] ?? "{}")).toMatchObject({
      transactionId: "TXN-INVALID-CURRENCY",
      status: "rejected",
      auditTrail: [
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "transaction-validator",
          transaction_id: "TXN-INVALID-CURRENCY",
          outcome: "rejected",
          reason_codes: ["UNSUPPORTED_CURRENCY"],
        },
      ],
    });
    expect(JSON.parse(serializedResults[3] ?? "{}")).toMatchObject({
      transactionId: "TXN-REVIEW",
      status: "review",
      riskScore: 50,
      riskFlags: ["HIGH_VALUE"],
      auditTrail: [
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "transaction-validator",
          transaction_id: "TXN-REVIEW",
          outcome: "validated",
          reason_codes: [],
        },
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "fraud-detector",
          transaction_id: "TXN-REVIEW",
          outcome: "assessed",
          reason_codes: ["HIGH_VALUE"],
        },
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "compliance-checker",
          transaction_id: "TXN-REVIEW",
          outcome: "review",
          reason_codes: ["RISK_SCORE_AT_OR_ABOVE_REVIEW_THRESHOLD"],
        },
      ],
    });

    await expect(readFile(join(resultsDirectory, "summary.json"), "utf8")).resolves.toBe(
      '{\n  "total": 4,\n  "approved": 1,\n  "review": 1,\n  "rejected": 2\n}\n',
    );
    await expect(readdir(join(sharedRoot, "input"))).resolves.toEqual([]);
    await expect(readdir(join(sharedRoot, "processing"))).resolves.toEqual([]);
    await expect(readdir(join(sharedRoot, "output"))).resolves.toEqual([]);
  });

  it("reserves summary.json from summary IDs on case-sensitive and case-insensitive filesystems", async () => {
    const root = await createTemporaryDirectory();
    const sharedRoot = join(root, "shared");
    const inputFile = await writeInput(root, [
      transaction({ transaction_id: "summary" }),
      transaction({ transaction_id: "SUMMARY" }),
    ]);

    await expect(runPipeline(optionsFor(inputFile, sharedRoot))).resolves.toEqual({
      total: 2,
      approved: 2,
      review: 0,
      rejected: 0,
    });

    const resultsDirectory = join(sharedRoot, "results");
    const resultFileNames = (await readdir(resultsDirectory))
      .filter((fileName) => fileName !== "summary.json")
      .sort();
    expect(resultFileNames).toEqual(["SUMMARY-3.json", "summary-2.json"]);
    await expect(readFile(join(resultsDirectory, "summary.json"), "utf8")).resolves.toBe(
      '{\n  "total": 2,\n  "approved": 2,\n  "review": 0,\n  "rejected": 0\n}\n',
    );
  });

  it("keeps a separate safe result for duplicate, fallback, and traversal-shaped IDs", async () => {
    const root = await createTemporaryDirectory();
    const sharedRoot = join(root, "shared");
    const inputFile = await writeInput(root, [
      transaction({ transaction_id: "TXN-DUPLICATE" }),
      transaction({ transaction_id: "TXN-DUPLICATE" }),
      transaction({ transaction_id: undefined }),
      transaction({ transaction_id: "../outside-result" }),
    ]);

    await expect(runPipeline(optionsFor(inputFile, sharedRoot))).resolves.toEqual({
      total: 4,
      approved: 2,
      review: 0,
      rejected: 2,
    });

    const resultsDirectory = join(sharedRoot, "results");
    const resultFileNames = (await readdir(resultsDirectory))
      .filter((fileName) => fileName !== "summary.json")
      .sort();
    expect(resultFileNames).toHaveLength(4);
    expect(resultFileNames).toContain("TXN-DUPLICATE.json");
    expect(resultFileNames).toContain("UNKNOWN-2.json");
    expect(resultFileNames.every((fileName) => !fileName.includes("/") && !fileName.includes(".."))).toBe(
      true,
    );
    await expect(readFile(join(root, "outside-result.json"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });

    const duplicateResults = await Promise.all(
      resultFileNames
        .filter((fileName) => fileName.startsWith("TXN-DUPLICATE"))
        .map(async (fileName) =>
          JSON.parse(await readFile(join(resultsDirectory, fileName), "utf8")) as {
            status: string;
            reasonCodes: string[];
          },
        ),
    );
    expect(duplicateResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "approved" }),
        expect.objectContaining({
          status: "rejected",
          reasonCodes: ["DUPLICATE_TRANSACTION_ID"],
        }),
      ]),
    );

    const canonicalIds = [
      "TXN-DUPLICATE",
      "TXN-DUPLICATE-2",
      "UNKNOWN-2",
      "UNKNOWN-3",
    ];
    const roundTrippedResults = await Promise.all(
      canonicalIds.map((transactionId) =>
        readTransactionResult(resultsDirectory, transactionId),
      ),
    );
    expect(roundTrippedResults.map((result) => result.transactionId)).toEqual(
      canonicalIds,
    );
    expect(roundTrippedResults.map((result) => result.status)).toEqual([
      "approved",
      "rejected",
      "rejected",
      "approved",
    ]);
  });

  it("turns malformed top-level JSON into a PII-safe system error", async () => {
    const root = await createTemporaryDirectory();
    const inputFile = join(root, "sample-transactions.json");
    const rawInput = '{"source_account":"PRIVATE-SOURCE-ACCOUNT-9001"';
    await writeFile(inputFile, rawInput, "utf8");

    const error = await systemErrorFrom(
      runPipeline(optionsFor(inputFile, join(root, "shared"))),
    );

    expect(error).toMatchObject({
      code: "PIPELINE_SYSTEM_ERROR",
      message: "Pipeline execution failed.",
    });
    expect(error.message).not.toContain(rawInput);
    expect(error.message).not.toContain("PRIVATE-SOURCE-ACCOUNT-9001");
  });

  it("invalidates a previous summary before a malformed rerun fails", async () => {
    const root = await createTemporaryDirectory();
    const sharedRoot = join(root, "shared");
    const inputFile = await writeInput(root, [transaction()]);

    await expect(runPipeline(optionsFor(inputFile, sharedRoot))).resolves.toEqual({
      total: 1,
      approved: 1,
      review: 0,
      rejected: 0,
    });
    await writeFile(inputFile, '{"description":"PRIVATE-RAW-RERUN"', "utf8");

    const error = await systemErrorFrom(runPipeline(optionsFor(inputFile, sharedRoot)));

    expect(error).toMatchObject({ code: "PIPELINE_SYSTEM_ERROR" });
    await expect(
      readFile(join(sharedRoot, "results", "summary.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("turns an injected stage write failure into a PII-safe system error", async () => {
    const root = await createTemporaryDirectory();
    const inputFile = await writeInput(root, [transaction()]);
    fileStoreControl.writeFailureActive = true;

    const error = await systemErrorFrom(
      runPipeline(optionsFor(inputFile, join(root, "shared"))),
    );

    expect(error).toMatchObject({
      code: "PIPELINE_SYSTEM_ERROR",
      message: "Pipeline execution failed.",
    });
    expect(error.message).not.toContain("INJECTED_WRITE_FAILURE_PRIVATE_ACCOUNT_9001");
  });
});
