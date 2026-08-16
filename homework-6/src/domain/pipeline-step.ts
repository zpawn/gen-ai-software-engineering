export const PIPELINE_STEPS = [
  "transaction-validator",
  "fraud-detector",
  "compliance-checker",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export interface StageExecution {
  step: PipelineStep;
  status: "completed" | "skipped";
  reasonCodes: string[];
}

export type PipelineConfigurationResult =
  | { valid: true; steps: readonly PipelineStep[] }
  | { valid: false; code: "INVALID_PIPELINE_STEPS" };
