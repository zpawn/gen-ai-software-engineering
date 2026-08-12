import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PIPELINE_CONFIG,
  type PipelineConfig,
} from "../config/pipeline-config.js";
import type { PipelineResult, PipelineSummary } from "../domain/pipeline-result.js";
import { runPipeline, type PipelineOptions } from "../integrator.js";
import { readJson } from "../infrastructure/file-store.js";
import type { RejectedTransaction } from "./validate-transactions.js";

export interface PipelineCliOptions extends PipelineOptions {
  config: PipelineConfig;
}

const repositoryRoot = (): string =>
  dirname(dirname(dirname(fileURLToPath(import.meta.url))));

export const createDefaultPipelineOptions = (): PipelineCliOptions => {
  const root = repositoryRoot();
  return {
    inputFile: join(root, "sample-transactions.json"),
    sharedRoot: join(root, "shared"),
    config: DEFAULT_PIPELINE_CONFIG,
  };
};

const readRejectedTransactions = async (
  resultsDirectory: string,
): Promise<RejectedTransaction[]> => {
  const resultFileNames = (await readdir(resultsDirectory)).filter(
    (fileName) => fileName.endsWith(".json") && fileName !== "summary.json",
  );
  const results = await Promise.all(
    resultFileNames.map((fileName) =>
      readJson<PipelineResult>(join(resultsDirectory, fileName)),
    ),
  );

  return results
    .filter((result) => result.status === "rejected")
    .map((result) => ({
      transactionId: result.transactionId,
      reasonCodes: [...result.reasonCodes],
    }));
};

export const formatPipelineSummary = (
  summary: PipelineSummary,
  rejectedTransactions: readonly RejectedTransaction[],
): string =>
  [
    `total=${summary.total}`,
    `approved=${summary.approved}`,
    `review=${summary.review}`,
    `rejected=${summary.rejected}`,
    ...[...rejectedTransactions]
      .sort((left, right) => left.transactionId.localeCompare(right.transactionId))
      .map(
      ({ transactionId, reasonCodes }) =>
        `rejected=${transactionId}: ${reasonCodes.join(",")}`,
      ),
  ].join("\n");

export const runPipelineFromOptions = async (
  options: PipelineCliOptions,
): Promise<string> => {
  const summary = await runPipeline(options);
  const rejectedTransactions = await readRejectedTransactions(
    join(options.sharedRoot, "results"),
  );
  return formatPipelineSummary(summary, rejectedTransactions);
};

export const main = async (): Promise<void> => {
  try {
    console.log(await runPipelineFromOptions(createDefaultPipelineOptions()));
  } catch {
    console.error("Pipeline run failed.");
    process.exitCode = 1;
  }
};

if (import.meta.main) {
  void main();
}
