import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  readPipelineSummary,
  readTransactionResult,
} from "../../src/infrastructure/results-repository.js";

const temporaryDirectories: string[] = [];

const createResultsDirectory = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "hw6-results-repository-"));
  temporaryDirectories.push(root);
  const resultsDirectory = join(root, "results");
  await mkdir(resultsDirectory);
  return resultsDirectory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("results repository", () => {
  it("reads a final transaction result from the results directory", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "TXN-RESULT-001.json"),
      JSON.stringify({
        transactionId: "TXN-RESULT-001",
        status: "review",
        reasonCodes: ["HIGH_VALUE"],
        explanation: "Transaction requires compliance review due to elevated risk.",
        riskScore: 50,
        riskFlags: ["HIGH_VALUE"],
        auditTrail: [
          {
            timestamp: "2026-08-10T12:00:00.000Z",
            agent_name: "compliance-checker",
            transaction_id: "TXN-RESULT-001",
            outcome: "review",
            reason_codes: ["HIGH_VALUE"],
          },
        ],
      }),
    );

    await expect(
      readTransactionResult(resultsDirectory, "TXN-RESULT-001"),
    ).resolves.toEqual({
      transactionId: "TXN-RESULT-001",
      status: "review",
      reasonCodes: ["HIGH_VALUE"],
      explanation: "Transaction requires compliance review due to elevated risk.",
      riskScore: 50,
      riskFlags: ["HIGH_VALUE"],
      auditTrail: [
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "compliance-checker",
          transaction_id: "TXN-RESULT-001",
          outcome: "review",
          reason_codes: ["HIGH_VALUE"],
        },
      ],
    });
  });

  it("returns TRANSACTION_NOT_FOUND when the requested final result is absent", async () => {
    const resultsDirectory = await createResultsDirectory();

    await expect(
      readTransactionResult(resultsDirectory, "TXN-MISSING-001"),
    ).rejects.toMatchObject({
      code: "TRANSACTION_NOT_FOUND",
      message: "Transaction result not found.",
    });
  });

  it("rejects a traversal ID before it can read a sibling file outside results", async () => {
    const resultsDirectory = await createResultsDirectory();
    const traversalId = "../outside";
    const outsideFileContent = JSON.stringify({
      transactionId: "OUTSIDE-RESULT",
      status: "approved",
      reasonCodes: [],
      explanation: "Result outside the repository boundary.",
    });
    await writeFile(join(resultsDirectory, "..", "outside.json"), outsideFileContent);

    const error = await readTransactionResult(resultsDirectory, traversalId).then(
      () => new Error("Expected traversal ID to be rejected."),
      (reason: unknown) => reason,
    );

    expect(error).toMatchObject({
      code: "TRANSACTION_NOT_FOUND",
      message: "Transaction result not found.",
    });
    expect((error as Error).message).not.toContain(traversalId);
    expect((error as Error).message).not.toContain(resultsDirectory);
    expect((error as Error).message).not.toContain(outsideFileContent);
  });

  it("returns RESULTS_READ_ERROR for malformed JSON without exposing file content", async () => {
    const resultsDirectory = await createResultsDirectory();
    const rawFileContent = '{"sourceAccount":"PRIVATE-SOURCE-ACCOUNT"';
    await writeFile(join(resultsDirectory, "TXN-BROKEN-001.json"), rawFileContent);

    try {
      await readTransactionResult(resultsDirectory, "TXN-BROKEN-001");
      throw new Error("Expected readTransactionResult to reject malformed JSON.");
    } catch (error) {
      expect(error).toMatchObject({ code: "RESULTS_READ_ERROR" });
      expect((error as Error).message).not.toContain(rawFileContent);
      expect((error as Error).message).not.toContain("PRIVATE-SOURCE-ACCOUNT");
    }
  });

  it("returns RESULTS_READ_ERROR for a syntactically valid but incomplete transaction result", async () => {
    const resultsDirectory = await createResultsDirectory();
    const privateMarker = "ACCOUNT-RESULT-SHAPE-MUST-NOT-LEAK";
    await writeFile(
      join(resultsDirectory, "TXN-INCOMPLETE-001.json"),
      JSON.stringify({
        transactionId: "TXN-INCOMPLETE-001",
        status: "approved",
        reasonCodes: [],
        explanation: "Transaction approved.",
        sourceAccount: privateMarker,
      }),
    );

    await expect(
      readTransactionResult(resultsDirectory, "TXN-INCOMPLETE-001"),
    ).rejects.toMatchObject({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
  });

  it("rejects a result whose stored transaction ID does not match the requested file", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "TXN-REQUESTED.json"),
      JSON.stringify({
        transactionId: "ACC-PLAINTEXT-SECRET",
        status: "approved",
        reasonCodes: [],
        explanation: "Transaction approved.",
        auditTrail: [],
      }),
    );

    await expect(
      readTransactionResult(resultsDirectory, "TXN-REQUESTED"),
    ).rejects.toMatchObject({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
  });

  it.each([
    [
      "an unsupported result status",
      {
        transactionId: "TXN-INVALID-STATUS",
        status: "pending",
        reasonCodes: [],
        explanation: "Pending.",
        auditTrail: [],
      },
    ],
    [
      "a non-string reason code",
      {
        transactionId: "TXN-INVALID-REASONS",
        status: "approved",
        reasonCodes: [42],
        explanation: "Approved.",
        auditTrail: [],
      },
    ],
    [
      "an invalid optional risk field",
      {
        transactionId: "TXN-INVALID-RISK",
        status: "approved",
        reasonCodes: [],
        explanation: "Approved.",
        riskScore: "0",
        auditTrail: [],
      },
    ],
    [
      "an unknown reason code",
      {
        transactionId: "TXN-UNSAFE-REASON",
        status: "rejected",
        reasonCodes: ["NAME: PRIVATE PERSON"],
        explanation: "Rejected.",
        auditTrail: [],
      },
    ],
    [
      "an unknown risk flag",
      {
        transactionId: "TXN-UNSAFE-FLAG",
        status: "review",
        reasonCodes: ["RISK_SCORE_AT_OR_ABOVE_REVIEW_THRESHOLD"],
        explanation: "Review.",
        riskScore: 50,
        riskFlags: ["ACCOUNT: 123456789"],
        auditTrail: [],
      },
    ],
    [
      "an out-of-range risk score",
      {
        transactionId: "TXN-INVALID-RISK-RANGE",
        status: "review",
        reasonCodes: ["RISK_SCORE_AT_OR_ABOVE_REVIEW_THRESHOLD"],
        explanation: "Review.",
        riskScore: 101,
        riskFlags: [],
        auditTrail: [],
      },
    ],
    [
      "an incomplete audit entry",
      {
        transactionId: "TXN-INVALID-AUDIT",
        status: "approved",
        reasonCodes: [],
        explanation: "Approved.",
        auditTrail: [
          {
            timestamp: "2026-08-10T12:00:00.000Z",
            agent_name: "compliance-checker",
            transaction_id: "TXN-INVALID-AUDIT",
            outcome: "approved",
          },
        ],
      },
    ],
  ])("returns RESULTS_READ_ERROR for %s", async (_description, value) => {
    const resultsDirectory = await createResultsDirectory();
    const transactionId = (value as { transactionId: string }).transactionId;
    await writeFile(join(resultsDirectory, `${transactionId}.json`), JSON.stringify(value));

    await expect(readTransactionResult(resultsDirectory, transactionId)).rejects.toMatchObject({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
  });

  it("reads the pipeline summary from summary.json", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "summary.json"),
      JSON.stringify({ total: 3, approved: 1, review: 1, rejected: 1 }),
    );

    await expect(readPipelineSummary(resultsDirectory)).resolves.toEqual({
      total: 3,
      approved: 1,
      review: 1,
      rejected: 1,
    });
  });

  it("returns SUMMARY_NOT_FOUND when summary.json is absent", async () => {
    const resultsDirectory = await createResultsDirectory();

    await expect(readPipelineSummary(resultsDirectory)).rejects.toMatchObject({
      code: "SUMMARY_NOT_FOUND",
      message: "Pipeline summary not found.",
    });
  });

  it.each([
    ["an incomplete summary", { total: 1 }],
    ["a non-integer summary count", { total: 1.5, approved: 1, review: 0, rejected: 0 }],
    ["a negative summary count", { total: -1, approved: -1, review: 0, rejected: 0 }],
    ["inconsistent summary totals", { total: 2, approved: 2, review: 1, rejected: 0 }],
  ])("returns RESULTS_READ_ERROR for %s", async (_description, value) => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(join(resultsDirectory, "summary.json"), JSON.stringify(value));

    await expect(readPipelineSummary(resultsDirectory)).rejects.toMatchObject({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
  });
});
