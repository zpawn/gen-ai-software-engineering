import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PIPELINE_CONFIG } from "../../src/config/pipeline-config.js";
import {
  DryRunInputError,
  formatDryRunSummary,
  validateTransactionsFile,
} from "../../src/cli/validate-transactions.js";
import {
  createDefaultPipelineOptions,
  formatPipelineSummary,
  runPipelineFromOptions,
} from "../../src/cli/run-pipeline.js";

const temporaryDirectories: string[] = [];

const transaction = (overrides: Record<string, unknown> = {}) => ({
  transaction_id: "TXN-VALID",
  timestamp: "2026-08-10T09:00:00Z",
  source_account: "PRIVATE-SOURCE-ACCOUNT-1001",
  destination_account: "PRIVATE-DESTINATION-ACCOUNT-2001",
  amount: "125.00",
  currency: "USD",
  transaction_type: "transfer",
  description: "Private transaction description that must not be printed",
  metadata: { channel: "online", country: "US" },
  ...overrides,
});

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "hw6-cli-"));
  temporaryDirectories.push(directory);
  return directory;
};

const writeJsonInput = async (root: string, contents: unknown): Promise<string> => {
  const inputFile = join(root, "transactions.json");
  await writeFile(inputFile, JSON.stringify(contents), "utf8");
  return inputFile;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("validateTransactionsFile", () => {
  it("counts valid and invalid records with hand-checked rejection reasons", async () => {
    const root = await createTemporaryDirectory();
    const inputFile = await writeJsonInput(root, [
      transaction(),
      transaction({ transaction_id: "TXN-BAD-CURRENCY", currency: "XYZ" }),
      transaction({ transaction_id: "TXN-BAD-AMOUNT", amount: "-1.00" }),
    ]);

    await expect(validateTransactionsFile({ inputFile })).resolves.toEqual({
      total: 3,
      valid: 1,
      invalid: 2,
      reasons: {
        UNSUPPORTED_CURRENCY: 1,
        NON_POSITIVE_AMOUNT: 1,
      },
      rejectedTransactions: [
        {
          transactionId: "TXN-BAD-CURRENCY",
          reasonCodes: ["UNSUPPORTED_CURRENCY"],
        },
        {
          transactionId: "TXN-BAD-AMOUNT",
          reasonCodes: ["NON_POSITIVE_AMOUNT"],
        },
      ],
    });
  });

  it("does not create a shared directory during a dry run", async () => {
    const root = await createTemporaryDirectory();
    const sharedRoot = join(root, "shared");
    const inputFile = await writeJsonInput(root, [transaction()]);

    await validateTransactionsFile({ inputFile });

    await expect(access(sharedRoot)).rejects.toThrow();
  });

  it("formats only summary counts, rejected IDs, and reason codes", () => {
    const output = formatDryRunSummary({
      total: 1,
      valid: 0,
      invalid: 1,
      reasons: { UNSUPPORTED_CURRENCY: 1 },
      rejectedTransactions: [
        {
          transactionId: "TXN-PRIVATE",
          reasonCodes: ["UNSUPPORTED_CURRENCY"],
        },
      ],
    });

    expect(output).toContain("total=1");
    expect(output).toContain("valid=0");
    expect(output).toContain("invalid=1");
    expect(output).toContain("TXN-PRIVATE");
    expect(output).toContain("UNSUPPORTED_CURRENCY");
    expect(output).not.toContain("PRIVATE-SOURCE-ACCOUNT-1001");
    expect(output).not.toContain("Private transaction description");
  });

  it("rejects malformed input with a controlled error that omits raw payload", async () => {
    const root = await createTemporaryDirectory();
    const inputFile = join(root, "transactions.json");
    await writeFile(
      inputFile,
      '{"source_account":"PRIVATE-SOURCE-ACCOUNT-1001"',
      "utf8",
    );

    await expect(validateTransactionsFile({ inputFile })).rejects.toEqual(
      new DryRunInputError(),
    );
  });
});

describe("pipeline CLI helpers", () => {
  it("uses repository-root defaults with the shared pipeline configuration", () => {
    const options = createDefaultPipelineOptions();

    expect(options).toMatchObject({
      inputFile: resolve("sample-transactions.json"),
      sharedRoot: resolve("shared"),
      config: DEFAULT_PIPELINE_CONFIG,
    });
  });

  it("formats pipeline output without account fields or descriptions", () => {
    const output = formatPipelineSummary(
      { total: 3, approved: 1, review: 0, rejected: 2 },
      [
        {
          transactionId: "TXN-ZEBRA",
          reasonCodes: ["UNSUPPORTED_CURRENCY"],
        },
        {
          transactionId: "TXN-PRIVATE",
          reasonCodes: ["UNSUPPORTED_CURRENCY"],
        },
      ],
    );

    expect(output).toContain("total=3");
    expect(output).toContain("approved=1");
    expect(output).toContain("rejected=2");
    expect(output).toContain("TXN-PRIVATE");
    expect(output).toContain("UNSUPPORTED_CURRENCY");
    expect(output.indexOf("TXN-PRIVATE")).toBeLessThan(
      output.indexOf("TXN-ZEBRA"),
    );
    expect(output).not.toContain("PRIVATE-SOURCE-ACCOUNT-1001");
    expect(output).not.toContain("Private transaction description");
  });

  it("sorts rejected pipeline results by transaction ID before emitting safe output", async () => {
    const root = await createTemporaryDirectory();
    const inputFile = await writeJsonInput(root, [
      transaction({ transaction_id: "TXN-ZEBRA", currency: "XYZ" }),
      transaction({ transaction_id: "TXN-ALPHA", amount: "-1.00" }),
    ]);

    const output = await runPipelineFromOptions({
      inputFile,
      steps: [
        "transaction-validator",
        "fraud-detector",
        "compliance-checker",
      ],
      sharedRoot: join(root, "shared"),
      config: DEFAULT_PIPELINE_CONFIG,
      now: () => "2026-08-10T12:00:00.000Z",
      createMessageId: () => "test-message-id",
    });

    expect(output).toBe([
      "total=2",
      "approved=0",
      "review=0",
      "rejected=2",
      "rejected=TXN-ALPHA: NON_POSITIVE_AMOUNT",
      "rejected=TXN-ZEBRA: UNSUPPORTED_CURRENCY",
    ].join("\n"));
    expect(output).not.toContain("PRIVATE-SOURCE-ACCOUNT-1001");
    expect(output).not.toContain("Private transaction description");
  });

  it("does not invoke either CLI main or filesystem operations when modules are imported", async () => {
    const originalExitCode = process.exitCode;
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const fileSystemCalls: string[] = [];
    const unexpectedFilesystemOperation = (operation: string): never => {
      fileSystemCalls.push(operation);
      throw new Error("CLI main was unexpectedly invoked during import.");
    };

    process.exitCode = undefined;
    vi.resetModules();
    vi.doMock("node:fs/promises", async () => {
      const actual = await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
      return {
        ...actual,
        mkdir: () => unexpectedFilesystemOperation("mkdir"),
        readFile: () => unexpectedFilesystemOperation("readFile"),
        readdir: () => unexpectedFilesystemOperation("readdir"),
        rename: () => unexpectedFilesystemOperation("rename"),
        rm: () => unexpectedFilesystemOperation("rm"),
        writeFile: () => unexpectedFilesystemOperation("writeFile"),
      };
    });

    try {
      await import("../../src/cli/validate-transactions.js");
      await import("../../src/cli/run-pipeline.js");
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(fileSystemCalls).toEqual([]);
      expect(consoleLog).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    } finally {
      process.exitCode = originalExitCode;
      consoleLog.mockRestore();
      consoleError.mockRestore();
      vi.doUnmock("node:fs/promises");
      vi.resetModules();
    }
  });
});
