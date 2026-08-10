import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateTransaction } from "../agents/transaction-validator.js";
import {
  DEFAULT_PIPELINE_CONFIG,
  type PipelineConfig,
} from "../config/pipeline-config.js";

export interface RejectedTransaction {
  transactionId: string;
  reasonCodes: string[];
}

export interface DryRunSummary {
  total: number;
  valid: number;
  invalid: number;
  reasons: Record<string, number>;
  rejectedTransactions: RejectedTransaction[];
}

export interface DryRunOptions {
  inputFile: string;
  config?: PipelineConfig;
}

export class DryRunInputError extends Error {
  public readonly code = "DRY_RUN_INPUT_ERROR";

  public constructor() {
    super("Transaction validation input could not be read.");
    this.name = "DryRunInputError";
  }
}

const defaultInputFile = (): string =>
  join(dirname(dirname(fileURLToPath(import.meta.url))), "..", "sample-transactions.json");

const readRecords = async (inputFile: string): Promise<unknown[]> => {
  try {
    const serializedInput = await readFile(inputFile, "utf8");
    const records: unknown = JSON.parse(serializedInput);
    if (!Array.isArray(records)) {
      throw new TypeError("Expected a JSON array.");
    }
    return records;
  } catch {
    throw new DryRunInputError();
  }
};

export const validateTransactionsFile = async (
  options: DryRunOptions,
): Promise<DryRunSummary> => {
  const records = await readRecords(options.inputFile);
  const supportedCurrencies =
    options.config?.supportedCurrencies ?? DEFAULT_PIPELINE_CONFIG.supportedCurrencies;
  const seenTransactionIds = new Set<string>();
  const summary: DryRunSummary = {
    total: records.length,
    valid: 0,
    invalid: 0,
    reasons: {},
    rejectedTransactions: [],
  };

  for (const [index, record] of records.entries()) {
    const result = validateTransaction(record, {
      seenTransactionIds,
      supportedCurrencies,
      fallbackTransactionId: `UNKNOWN-${index}`,
    });

    if (result.valid) {
      summary.valid += 1;
      continue;
    }

    summary.invalid += 1;
    summary.rejectedTransactions.push({
      transactionId: result.transactionId,
      reasonCodes: [...result.reasonCodes],
    });
    for (const reasonCode of result.reasonCodes) {
      summary.reasons[reasonCode] = (summary.reasons[reasonCode] ?? 0) + 1;
    }
  }

  return summary;
};

export const formatDryRunSummary = (summary: DryRunSummary): string =>
  [
    `total=${summary.total}`,
    `valid=${summary.valid}`,
    `invalid=${summary.invalid}`,
    ...summary.rejectedTransactions.map(
      ({ transactionId, reasonCodes }) =>
        `rejected=${transactionId}: ${reasonCodes.join(",")}`,
    ),
  ].join("\n");

export const main = async (): Promise<void> => {
  try {
    const summary = await validateTransactionsFile({
      inputFile: defaultInputFile(),
      config: DEFAULT_PIPELINE_CONFIG,
    });
    console.log(formatDryRunSummary(summary));
  } catch {
    console.error("Transaction validation dry run failed.");
    process.exitCode = 1;
  }
};

if (import.meta.main) {
  void main();
}
