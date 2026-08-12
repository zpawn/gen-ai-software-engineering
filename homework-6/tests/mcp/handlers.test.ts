import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  getPipelineSummaryResource,
  getTransactionStatus,
  listPipelineResults,
} from "../../mcp/handlers.js";

const temporaryDirectories: string[] = [];

const createResultsDirectory = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "hw6-mcp-handlers-"));
  temporaryDirectories.push(root);
  const resultsDirectory = join(root, "results");
  await mkdir(resultsDirectory);
  return resultsDirectory;
};

const writeResult = async (
  resultsDirectory: string,
  transactionId: string,
  overrides: Record<string, unknown> = {},
): Promise<void> => {
  await writeFile(
    join(resultsDirectory, `${transactionId}.json`),
    JSON.stringify({
      transactionId,
      status: "review",
      reasonCodes: ["HIGH_VALUE"],
      explanation: "PRIVATE-EXPLANATION-MARKER",
      riskScore: 50,
      riskFlags: ["HIGH_VALUE"],
      auditTrail: [
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          agent_name: "compliance-checker",
          transaction_id: transactionId,
          outcome: "review",
          reason_codes: ["HIGH_VALUE"],
        },
      ],
      ...overrides,
    }),
  );
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("MCP handlers", () => {
  it("returns only the approved safe transaction status fields", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeResult(resultsDirectory, "TXN001");

    const status = await getTransactionStatus(resultsDirectory, "TXN001");

    expect(status).toEqual({
      transactionId: "TXN001",
      status: "review",
      reasonCodes: ["HIGH_VALUE"],
      riskScore: 50,
      riskFlags: ["HIGH_VALUE"],
    });
    expect(JSON.stringify(status)).not.toContain("PRIVATE-EXPLANATION-MARKER");
    expect(status).not.toHaveProperty("explanation");
    expect(status).not.toHaveProperty("auditTrail");
  });

  it("omits optional risk fields when validation rejected the transaction", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeResult(resultsDirectory, "TXN002", {
      status: "rejected",
      reasonCodes: ["UNSUPPORTED_CURRENCY"],
      riskScore: undefined,
      riskFlags: undefined,
      auditTrail: [],
    });

    await expect(
      getTransactionStatus(resultsDirectory, "TXN002"),
    ).resolves.toEqual({
      transactionId: "TXN002",
      status: "rejected",
      reasonCodes: ["UNSUPPORTED_CURRENCY"],
    });
  });

  it("returns the validated pipeline summary as data and deterministic text", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "summary.json"),
      JSON.stringify({ total: 3, approved: 1, review: 1, rejected: 1 }),
    );

    await expect(listPipelineResults(resultsDirectory)).resolves.toEqual({
      total: 3,
      approved: 1,
      review: 1,
      rejected: 1,
    });
    await expect(getPipelineSummaryResource(resultsDirectory)).resolves.toBe(
      "Pipeline summary: total=3, approved=1, review=1, rejected=1.",
    );
  });

  it("preserves the repository safe error contract for unknown transaction IDs", async () => {
    const resultsDirectory = await createResultsDirectory();
    const unsafeId = "../PRIVATE-PATH-MARKER";

    const error = await getTransactionStatus(resultsDirectory, unsafeId).then(
      () => new Error("Expected transaction lookup to fail."),
      (reason: unknown) => reason,
    );

    expect(error).toMatchObject({
      code: "TRANSACTION_NOT_FOUND",
      message: "Transaction result not found.",
    });
    expect((error as Error).message).not.toContain(unsafeId);
    expect((error as Error).message).not.toContain(resultsDirectory);
  });

  it("rejects shape-valid result strings that are not pipeline-generated codes", async () => {
    const resultsDirectory = await createResultsDirectory();
    const privateMarker = "NAME: PRIVATE PERSON";
    await writeResult(resultsDirectory, "TXN003", {
      reasonCodes: [privateMarker],
    });

    const error = await getTransactionStatus(resultsDirectory, "TXN003").then(
      () => new Error("Expected unsafe result codes to be rejected."),
      (reason: unknown) => reason,
    );

    expect(error).toMatchObject({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
    expect((error as Error).message).not.toContain(privateMarker);
  });
});
