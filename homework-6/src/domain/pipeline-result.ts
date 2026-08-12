import type { StageExecution } from "./pipeline-step.js";

export type FinalStatus = "approved" | "review" | "rejected";

export interface AuditEntry {
  timestamp: string;
  agent_name: string;
  transaction_id: string;
  outcome: string;
  reason_codes: string[];
}

export interface PipelineResult {
  transactionId: string;
  status: FinalStatus;
  reasonCodes: string[];
  explanation: string;
  riskScore?: number;
  riskFlags?: string[];
  auditTrail: AuditEntry[];
  stageTrace: StageExecution[];
}

export interface PipelineSummary {
  total: number;
  approved: number;
  review: number;
  rejected: number;
}
