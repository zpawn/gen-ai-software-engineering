import { describe, expect, it } from "vitest";

import {
  checkCompliance,
  type ComplianceConfig,
} from "../../src/agents/compliance-checker.js";
import type {
  FraudAssessment,
  ValidTransaction,
} from "../../src/domain/transaction.js";

const config: ComplianceConfig = { reviewThreshold: 50 };

const transaction = (): ValidTransaction =>
  ({
    transactionId: "TXN-COMPLIANCE-001",
    timestamp: "2026-03-16T09:00:00Z",
    sourceAccount: "SOURCE-ACCOUNT-PRIVATE",
    destinationAccount: "DESTINATION-ACCOUNT-PRIVATE",
    amount: "1500.00",
    currency: "USD",
    transactionType: "transfer",
    country: "US",
    description: "Private description that must not leak",
  }) as ValidTransaction;

const assessment = (riskScore: number): FraudAssessment => ({
  riskScore,
  riskFlags: [],
});

describe("checkCompliance", () => {
  it("approves a score below the configured review threshold", () => {
    expect(checkCompliance(transaction(), assessment(49), config)).toEqual({
      status: "approved",
      reasonCodes: ["RISK_SCORE_BELOW_REVIEW_THRESHOLD"],
      explanation: "Transaction meets compliance requirements.",
    });
  });

  it("reviews a score equal to the configured review threshold", () => {
    expect(checkCompliance(transaction(), assessment(50), config)).toEqual({
      status: "review",
      reasonCodes: ["RISK_SCORE_AT_OR_ABOVE_REVIEW_THRESHOLD"],
      explanation: "Transaction requires compliance review due to elevated risk.",
    });
  });

  it("uses a non-default configured threshold at its boundary", () => {
    expect(
      checkCompliance(transaction(), assessment(10), { reviewThreshold: 10 }),
    ).toEqual({
      status: "review",
      reasonCodes: ["RISK_SCORE_AT_OR_ABOVE_REVIEW_THRESHOLD"],
      explanation: "Transaction requires compliance review due to elevated risk.",
    });
  });

  it("keeps the compliance result free of account IDs and descriptions", () => {
    const result = checkCompliance(transaction(), assessment(50), config);
    const serializedResult = JSON.stringify(result);

    expect(serializedResult).not.toContain("SOURCE-ACCOUNT-PRIVATE");
    expect(serializedResult).not.toContain("DESTINATION-ACCOUNT-PRIVATE");
    expect(serializedResult).not.toContain("Private description that must not leak");
  });
});
