import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, test } from "vitest";

import { buildApp } from "../../src/api/app.js";

const transactionResult = {
  transactionId: "TXN-API-001",
  status: "approved" as const,
  reasonCodes: ["COMPLIANCE_APPROVED"],
  explanation: "Transaction approved.",
  riskScore: 0,
  riskFlags: [],
  auditTrail: [
    {
      timestamp: "2026-08-10T12:00:00.000Z",
      agent_name: "compliance-checker",
      transaction_id: "TXN-API-001",
      outcome: "approved",
      reason_codes: ["COMPLIANCE_APPROVED"],
    },
  ],
};

const summary = {
  total: 3,
  approved: 1,
  review: 1,
  rejected: 1,
};

const appInstances: FastifyInstance[] = [];
const temporaryDirectories: string[] = [];

const createResultsDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "hw6-api-"));
  const resultsDirectory = join(directory, "results");

  await mkdir(resultsDirectory);
  temporaryDirectories.push(directory);

  return resultsDirectory;
};

const createApp = (resultsDirectory: string): FastifyInstance => {
  const app = buildApp({ resultsDirectory });
  appInstances.push(app);
  return app;
};

afterEach(async () => {
  await Promise.all(appInstances.splice(0).map((app) => app.close()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("read-only results API", () => {
  test("returns an operational health response without reading pipeline results", async () => {
    const resultsDirectory = await createResultsDirectory();
    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  test("returns the stored final result for an existing transaction", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "TXN-API-001.json"),
      JSON.stringify(transactionResult),
      "utf8",
    );

    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/transactions/TXN-API-001",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(transactionResult);
  });

  test("returns the repository transaction-not-found code for a missing transaction", async () => {
    const resultsDirectory = await createResultsDirectory();
    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/transactions/TXN-API-MISSING",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "TRANSACTION_NOT_FOUND",
      message: "Transaction result not found.",
    });
  });

  test("returns the stored latest pipeline summary", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "summary.json"),
      JSON.stringify(summary),
      "utf8",
    );

    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/summary",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(summary);
  });

  test("returns the repository summary-not-found code before a pipeline run", async () => {
    const resultsDirectory = await createResultsDirectory();
    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/summary",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "SUMMARY_NOT_FOUND",
      message: "Pipeline summary not found.",
    });
  });

  test("returns a controlled PII-safe error for a malformed result file", async () => {
    const resultsDirectory = await createResultsDirectory();
    const rawMarker = "ACCOUNT-123456789-DO-NOT-LEAK";
    await writeFile(
      join(resultsDirectory, "TXN-API-BROKEN.json"),
      `{\"sourceAccount\":\"${rawMarker}\"`,
      "utf8",
    );

    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/transactions/TXN-API-BROKEN",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
    expect(response.body).not.toContain(rawMarker);
  });

  test("returns a controlled PII-safe error for an incomplete transaction result", async () => {
    const resultsDirectory = await createResultsDirectory();
    const rawMarker = "ACCOUNT-INCOMPLETE-RESULT-MUST-NOT-LEAK";
    await writeFile(
      join(resultsDirectory, "TXN-API-INCOMPLETE.json"),
      JSON.stringify({
        transactionId: "TXN-API-INCOMPLETE",
        status: "approved",
        reasonCodes: [],
        explanation: "Transaction approved.",
        sourceAccount: rawMarker,
      }),
      "utf8",
    );

    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/transactions/TXN-API-INCOMPLETE",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
    expect(response.body).not.toContain(rawMarker);
  });

  test("returns a controlled PII-safe error for an incomplete summary", async () => {
    const resultsDirectory = await createResultsDirectory();
    const rawMarker = "ACCOUNT-INCOMPLETE-SUMMARY-MUST-NOT-LEAK";
    await writeFile(
      join(resultsDirectory, "summary.json"),
      JSON.stringify({ total: 1, sourceAccount: rawMarker }),
      "utf8",
    );

    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/summary",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
    expect(response.body).not.toContain(rawMarker);
  });

  test("returns a controlled PII-safe error for malformed summary JSON", async () => {
    const resultsDirectory = await createResultsDirectory();
    const rawMarker = "ACCOUNT-MALFORMED-SUMMARY-MUST-NOT-LEAK";
    await writeFile(
      join(resultsDirectory, "summary.json"),
      `{\"sourceAccount\":\"${rawMarker}\"`,
      "utf8",
    );

    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url: "/summary",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "RESULTS_READ_ERROR",
      message: "Unable to read pipeline results.",
    });
    expect(response.body).not.toContain(rawMarker);
  });

  test.each([
    ["an empty transaction ID", "/transactions/"],
    ["an encoded path-shaped transaction ID", "/transactions/%2E%2E%2Foutside"],
  ])("returns a safe not-found reply for %s", async (_description, url) => {
    const resultsDirectory = await createResultsDirectory();
    const response = await createApp(resultsDirectory).inject({
      method: "GET",
      url,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "TRANSACTION_NOT_FOUND",
      message: "Transaction result not found.",
    });
  });
});
