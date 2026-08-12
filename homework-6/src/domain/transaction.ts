export type RawTransaction = unknown;

export interface ValidTransaction {
  transactionId: string;
  timestamp: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: string;
  currency: string;
  transactionType: string;
  country: string;
}

export interface ValidationSuccess {
  valid: true;
  transaction: ValidTransaction;
}

export interface ValidationFailure {
  valid: false;
  transactionId: string;
  reasonCodes: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export interface FraudAssessment {
  riskScore: number;
  riskFlags: string[];
}

export type ComplianceStatus = "approved" | "review";

export interface ComplianceResult {
  status: ComplianceStatus;
  reasonCodes: string[];
  explanation: string;
}
