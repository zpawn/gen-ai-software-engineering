import type {
  PipelineResult,
  PipelineSummary,
} from "../domain/pipeline-result.js";
import { join } from "node:path";

import { readJson } from "./file-store.js";

export type ResultsRepositoryErrorCode =
  | "TRANSACTION_NOT_FOUND"
  | "SUMMARY_NOT_FOUND"
  | "RESULTS_READ_ERROR";

export class ResultsRepositoryError extends Error {
  public constructor(
    public readonly code: ResultsRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ResultsRepositoryError";
  }
}

const isMissingFileError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

const isSafeTransactionId = (transactionId: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(transactionId);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const ALLOWED_RESULT_CODES = new Set([
  "INVALID_TRANSACTION",
  "MISSING_TRANSACTION_ID",
  "INVALID_TRANSACTION_ID",
  "DUPLICATE_TRANSACTION_ID",
  "MISSING_TIMESTAMP",
  "INVALID_TIMESTAMP",
  "NON_UTC_TIMESTAMP",
  "MISSING_SOURCE_ACCOUNT",
  "INVALID_SOURCE_ACCOUNT",
  "MISSING_DESTINATION_ACCOUNT",
  "INVALID_DESTINATION_ACCOUNT",
  "MISSING_AMOUNT",
  "INVALID_AMOUNT",
  "NON_POSITIVE_AMOUNT",
  "MISSING_CURRENCY",
  "INVALID_CURRENCY",
  "UNSUPPORTED_CURRENCY",
  "MISSING_TRANSACTION_TYPE",
  "INVALID_TRANSACTION_TYPE",
  "MISSING_COUNTRY",
  "INVALID_COUNTRY",
  "HIGH_VALUE",
  "UNUSUAL_TIME",
  "CROSS_BORDER",
  "RISK_SCORE_BELOW_REVIEW_THRESHOLD",
  "RISK_SCORE_AT_OR_ABOVE_REVIEW_THRESHOLD",
  "COMPLIANCE_APPROVED",
]);

const isAllowedCodeArray = (value: unknown): value is string[] =>
  isStringArray(value) && value.every((code) => ALLOWED_RESULT_CODES.has(code));

const hasOnlyKeys = (
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean => Object.keys(record).every((key) => allowedKeys.includes(key));

const isAuditEntry = (value: unknown): boolean =>
  isRecord(value) &&
  hasOnlyKeys(value, [
    "timestamp",
    "agent_name",
    "transaction_id",
    "outcome",
    "reason_codes",
  ]) &&
  typeof value.timestamp === "string" &&
  typeof value.agent_name === "string" &&
  typeof value.transaction_id === "string" &&
  typeof value.outcome === "string" &&
  isAllowedCodeArray(value.reason_codes);

const isPipelineResult = (value: unknown): value is PipelineResult => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "transactionId",
      "status",
      "reasonCodes",
      "explanation",
      "riskScore",
      "riskFlags",
      "auditTrail",
    ]) ||
    typeof value.transactionId !== "string" ||
    !["approved", "review", "rejected"].includes(String(value.status)) ||
    !isAllowedCodeArray(value.reasonCodes) ||
    typeof value.explanation !== "string" ||
    !Array.isArray(value.auditTrail) ||
    !value.auditTrail.every(isAuditEntry)
  ) {
    return false;
  }

  return (
    (value.riskScore === undefined ||
      (typeof value.riskScore === "number" &&
        Number.isFinite(value.riskScore) &&
        value.riskScore >= 0 &&
        value.riskScore <= 100)) &&
    (value.riskFlags === undefined || isAllowedCodeArray(value.riskFlags))
  );
};

const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;

const isPipelineSummary = (value: unknown): value is PipelineSummary => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["total", "approved", "review", "rejected"]) ||
    !isNonNegativeInteger(value.total) ||
    !isNonNegativeInteger(value.approved) ||
    !isNonNegativeInteger(value.review) ||
    !isNonNegativeInteger(value.rejected)
  ) {
    return false;
  }

  return value.total === value.approved + value.review + value.rejected;
};

const readResultFile = async <T>(
  filePath: string,
  missingCode: "TRANSACTION_NOT_FOUND" | "SUMMARY_NOT_FOUND",
  missingMessage: string,
  isExpectedResult: (value: unknown) => value is T,
): Promise<T> => {
  try {
    const result = await readJson<unknown>(filePath);
    if (!isExpectedResult(result)) {
      throw new ResultsRepositoryError(
        "RESULTS_READ_ERROR",
        "Unable to read pipeline results.",
      );
    }

    return result;
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new ResultsRepositoryError(missingCode, missingMessage);
    }

    if (error instanceof ResultsRepositoryError) {
      throw error;
    }

    throw new ResultsRepositoryError(
      "RESULTS_READ_ERROR",
      "Unable to read pipeline results.",
    );
  }
};

export const readTransactionResult = async (
  resultsDirectory: string,
  transactionId: string,
): Promise<PipelineResult> => {
  if (!isSafeTransactionId(transactionId)) {
    throw new ResultsRepositoryError(
      "TRANSACTION_NOT_FOUND",
      "Transaction result not found.",
    );
  }

  const result = await readResultFile<PipelineResult>(
    join(resultsDirectory, `${transactionId}.json`),
    "TRANSACTION_NOT_FOUND",
    "Transaction result not found.",
    isPipelineResult,
  );

  if (result.transactionId !== transactionId) {
    throw new ResultsRepositoryError(
      "RESULTS_READ_ERROR",
      "Unable to read pipeline results.",
    );
  }

  return result;
};

export const readPipelineSummary = async (
  resultsDirectory: string,
): Promise<PipelineSummary> =>
  readResultFile<PipelineSummary>(
    join(resultsDirectory, "summary.json"),
    "SUMMARY_NOT_FOUND",
    "Pipeline summary not found.",
    isPipelineSummary,
  );
