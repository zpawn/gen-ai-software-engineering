import type {
  ComplianceResult,
  FraudAssessment,
  ValidTransaction,
} from "../domain/transaction.js";

export interface ComplianceConfig {
  reviewThreshold: number;
}

const APPROVED_REASON_CODES = [
  "RISK_SCORE_BELOW_REVIEW_THRESHOLD",
] as const;
const REVIEW_REASON_CODES = [
  "RISK_SCORE_AT_OR_ABOVE_REVIEW_THRESHOLD",
] as const;

const APPROVED_EXPLANATION = "Transaction meets compliance requirements.";
const REVIEW_EXPLANATION =
  "Transaction requires compliance review due to elevated risk.";

export function checkCompliance(
  _transaction: ValidTransaction,
  assessment: FraudAssessment,
  config: ComplianceConfig,
): ComplianceResult {
  if (assessment.riskScore >= config.reviewThreshold) {
    return {
      status: "review",
      reasonCodes: [...REVIEW_REASON_CODES],
      explanation: REVIEW_EXPLANATION,
    };
  }

  return {
    status: "approved",
    reasonCodes: [...APPROVED_REASON_CODES],
    explanation: APPROVED_EXPLANATION,
  };
}
