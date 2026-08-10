import type {
  FinalStatus,
  PipelineSummary,
} from "../src/domain/pipeline-result.js";
import {
  readPipelineSummary,
  readTransactionResult,
} from "../src/infrastructure/results-repository.js";

export interface SafeTransactionStatus {
  transactionId: string;
  status: FinalStatus;
  reasonCodes: string[];
  riskScore?: number;
  riskFlags?: string[];
}

export const getTransactionStatus = async (
  resultsDirectory: string,
  transactionId: string,
): Promise<SafeTransactionStatus> => {
  const result = await readTransactionResult(resultsDirectory, transactionId);

  return {
    transactionId: result.transactionId,
    status: result.status,
    reasonCodes: result.reasonCodes,
    ...(result.riskScore === undefined
      ? {}
      : { riskScore: result.riskScore }),
    ...(result.riskFlags === undefined
      ? {}
      : { riskFlags: result.riskFlags }),
  };
};

export const listPipelineResults = (
  resultsDirectory: string,
): Promise<PipelineSummary> => readPipelineSummary(resultsDirectory);

export const getPipelineSummaryResource = async (
  resultsDirectory: string,
): Promise<string> => {
  const summary = await listPipelineResults(resultsDirectory);

  return `Pipeline summary: total=${summary.total}, approved=${summary.approved}, review=${summary.review}, rejected=${summary.rejected}.`;
};
