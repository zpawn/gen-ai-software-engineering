import type { AuditEntry } from "../domain/pipeline-result.js";

export interface AuditEntryInput {
  agentName: string;
  transactionId: string;
  outcome: string;
  reasonCodes: string[];
  now?: () => string;
}

export const createAuditEntry = (input: AuditEntryInput): AuditEntry => ({
  timestamp: input.now?.() ?? new Date().toISOString(),
  agent_name: input.agentName,
  transaction_id: input.transactionId,
  outcome: input.outcome,
  reason_codes: [...input.reasonCodes],
});
