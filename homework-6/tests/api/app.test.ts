import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, test, vi } from "vitest";

import { buildApp } from "../../src/api/app.js";

const transactionResult = {
  transactionId: "TXN-API-001",
  status: "approved" as const,
  reasonCodes: ["RISK_SCORE_BELOW_REVIEW_THRESHOLD"],
  explanation: "Transaction meets compliance requirements.",
  riskScore: 0,
  riskFlags: [],
  auditTrail: [
    {
      timestamp: "2026-08-10T12:00:00.000Z",
      agent_name: "compliance-checker",
      transaction_id: "TXN-API-001",
      outcome: "approved",
      reason_codes: ["RISK_SCORE_BELOW_REVIEW_THRESHOLD"],
    },
  ],
  stageTrace: [
    { step: "transaction-validator", status: "completed", reasonCodes: [] },
    { step: "fraud-detector", status: "completed", reasonCodes: [] },
    {
      step: "compliance-checker",
      status: "completed",
      reasonCodes: ["RISK_SCORE_BELOW_REVIEW_THRESHOLD"],
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
  test("submits transactions through the REST gateway and stores file-based results", async () => {
    const resultsDirectory = await createResultsDirectory();
    const app = createApp(resultsDirectory);
    const response = await app.inject({
      method: "POST",
      url: "/pipeline/run",
      payload: {
        steps: [
          "transaction-validator",
          "fraud-detector",
          "compliance-checker",
        ],
        transactions: [
          {
            transaction_id: "TXN-REST-001",
            timestamp: "2026-08-10T09:00:00Z",
            source_account: "PRIVATE-REST-SOURCE-1001",
            destination_account: "PRIVATE-REST-DESTINATION-1002",
            amount: "125.00",
            currency: "USD",
            transaction_type: "transfer",
            description: "Private REST description",
            metadata: { country: "US" },
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      summary: { total: 1, approved: 1, review: 0, rejected: 0 },
    });
    expect(response.body).not.toContain("PRIVATE-REST-SOURCE-1001");
    expect(response.body).not.toContain("PRIVATE-REST-DESTINATION-1002");
    expect(response.body).not.toContain("Private REST description");

    const storedResponse = await app.inject({
      method: "GET",
      url: "/transactions/TXN-REST-001",
    });
    expect(storedResponse.statusCode).toBe(200);
    expect(storedResponse.json()).toMatchObject({
      transactionId: "TXN-REST-001",
      status: "approved",
      stageTrace: [
        { step: "transaction-validator", status: "completed" },
        { step: "fraud-detector", status: "completed" },
        { step: "compliance-checker", status: "completed" },
      ],
    });
    expect(storedResponse.body).not.toContain("PRIVATE-REST-SOURCE-1001");
  });

  test("rejects duplicate pipeline steps before clearing stored results", async () => {
    const resultsDirectory = await createResultsDirectory();
    const sentinelPath = join(resultsDirectory, "sentinel.json");
    await writeFile(sentinelPath, '{"preserved":true}', "utf8");
    const response = await createApp(resultsDirectory).inject({
      method: "POST",
      url: "/pipeline/run",
      payload: {
        steps: [
          "transaction-validator",
          "fraud-detector",
          "fraud-detector",
        ],
        transactions: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "INVALID_PIPELINE_STEPS",
      message: "Pipeline steps must contain every supported step exactly once.",
    });
    await expect(
      import("node:fs/promises").then(({ readFile }) =>
        readFile(sentinelPath, "utf8"),
      ),
    ).resolves.toBe('{"preserved":true}');
  });

  test("returns the pipeline-step error for an unknown step name", async () => {
    const resultsDirectory = await createResultsDirectory();
    const response = await createApp(resultsDirectory).inject({
      method: "POST",
      url: "/pipeline/run",
      payload: {
        steps: [
          "transaction-validator",
          "fraud-detector",
          "private-account-reader",
        ],
        transactions: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "INVALID_PIPELINE_STEPS",
      message: "Pipeline steps must contain every supported step exactly once.",
    });
  });

  test("returns a controlled request error for a malformed POST body", async () => {
    const resultsDirectory = await createResultsDirectory();
    const privateMarker = "PRIVATE-BODY-MARKER-MUST-NOT-LEAK";
    const response = await createApp(resultsDirectory).inject({
      method: "POST",
      url: "/pipeline/run",
      payload: {
        steps: [
          "transaction-validator",
          "fraud-detector",
          "compliance-checker",
        ],
        unexpectedPrivateField: privateMarker,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "INVALID_PIPELINE_REQUEST",
      message: "Pipeline run request is invalid.",
    });
    expect(response.body).not.toContain(privateMarker);
  });

  test("returns a controlled system error when pipeline execution fails", async () => {
    const resultsDirectory = await createResultsDirectory();
    const privateMarker = "PRIVATE-RUNNER-FAILURE-MUST-NOT-LEAK";
    const app = buildApp({
      resultsDirectory,
      pipelineRunner: async () => {
        throw new Error(privateMarker);
      },
    });
    appInstances.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/pipeline/run",
      payload: {
        steps: [
          "transaction-validator",
          "fraud-detector",
          "compliance-checker",
        ],
        transactions: [],
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "PIPELINE_SYSTEM_ERROR",
      message: "Pipeline execution failed.",
    });
    expect(response.body).not.toContain(privateMarker);
  });

  test("rejects an overlapping run and releases the lock after completion", async () => {
    const resultsDirectory = await createResultsDirectory();
    const summary = { total: 0, approved: 0, review: 0, rejected: 0 };
    let resolveFirstRun: ((value: typeof summary) => void) | undefined;
    let callCount = 0;
    const pipelineRunner = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<typeof summary>((resolve) => {
          resolveFirstRun = resolve;
        });
      }

      return summary;
    });
    const app = buildApp({ resultsDirectory, pipelineRunner });
    appInstances.push(app);
    const payload = {
      steps: [
        "transaction-validator",
        "fraud-detector",
        "compliance-checker",
      ],
      transactions: [],
    };

    const firstResponsePromise = app.inject({
      method: "POST",
      url: "/pipeline/run",
      payload,
    });
    await vi.waitFor(() => expect(resolveFirstRun).toBeTypeOf("function"));

    const overlappingResponse = await app.inject({
      method: "POST",
      url: "/pipeline/run",
      payload,
    });
    expect(overlappingResponse.statusCode).toBe(409);
    expect(overlappingResponse.json()).toEqual({
      code: "PIPELINE_BUSY",
      message: "A pipeline run is already in progress.",
    });

    resolveFirstRun?.(summary);
    expect((await firstResponsePromise).statusCode).toBe(200);

    const laterResponse = await app.inject({
      method: "POST",
      url: "/pipeline/run",
      payload,
    });
    expect(laterResponse.statusCode).toBe(200);
  });

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
