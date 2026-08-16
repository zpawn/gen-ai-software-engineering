import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { checkCompliance } from "./agents/compliance-checker.js";
import { assessFraudRisk } from "./agents/fraud-detector.js";
import { configurePipeline } from "./agents/pipeline-configurator.js";
import { validateTransaction } from "./agents/transaction-validator.js";
import type { PipelineConfig } from "./config/pipeline-config.js";
import type { PipelineMessage } from "./domain/pipeline-message.js";
import type {
  AuditEntry,
  PipelineResult,
  PipelineSummary,
} from "./domain/pipeline-result.js";
import type {
  PipelineStep,
  StageExecution,
} from "./domain/pipeline-step.js";
import type {
  ComplianceResult,
  FraudAssessment,
  ValidTransaction,
} from "./domain/transaction.js";
import { createAuditEntry } from "./infrastructure/audit-logger.js";
import * as fileStore from "./infrastructure/file-store.js";

type PipelineInput =
  | { inputFile: string; transactions?: never }
  | { inputFile?: never; transactions: readonly unknown[] };

export type PipelineOptions = PipelineInput & {
  steps: readonly PipelineStep[];
  sharedRoot: string;
  config: PipelineConfig;
  now?: () => string;
  createMessageId?: () => string;
};

export class InvalidPipelineStepsError extends Error {
  public readonly code = "INVALID_PIPELINE_STEPS";

  public constructor() {
    super("Pipeline steps must contain every supported step exactly once.");
    this.name = "InvalidPipelineStepsError";
  }
}

export class PipelineSystemError extends Error {
  public readonly code = "PIPELINE_SYSTEM_ERROR";

  public constructor() {
    super("Pipeline execution failed.");
    this.name = "PipelineSystemError";
  }
}

interface ValidationFailureState {
  transactionId: string;
  reasonCodes: string[];
}

interface PipelineState {
  rawTransaction: unknown;
  fallbackTransactionId: string;
  canonicalResultId?: string;
  transaction?: ValidTransaction;
  validationFailure?: ValidationFailureState;
  assessment?: FraudAssessment;
  compliance?: ComplianceResult;
  auditTrail: AuditEntry[];
  stageTrace: StageExecution[];
}

type StageHandler = (state: PipelineState) => PipelineState;

const SAFE_FILENAME_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const DEPENDENCY_REASON_CODE = "PIPELINE_DEPENDENCY_MISSING";

const createMessage = <TData>(
  data: TData,
  sourceAgent: string,
  targetAgent: string,
  now: () => string,
  createMessageId: () => string,
): PipelineMessage<TData> => ({
  message_id: createMessageId(),
  timestamp: now(),
  source_agent: sourceAgent,
  target_agent: targetAgent,
  message_type: "transaction",
  data,
});

const createSummary = (outcomes: readonly PipelineResult[]): PipelineSummary => {
  const summary: PipelineSummary = {
    total: outcomes.length,
    approved: 0,
    review: 0,
    rejected: 0,
  };

  for (const outcome of outcomes) {
    summary[outcome.status] += 1;
  }

  return summary;
};

const createCanonicalResultId = (
  transactionId: string,
  index: number,
  usedResultIds: Set<string>,
): string => {
  const baseResultId = SAFE_FILENAME_ID_PATTERN.test(transactionId)
    ? transactionId
    : `UNKNOWN-${index}`;
  let resultId = baseResultId;
  let suffix = 2;

  while (usedResultIds.has(resultId.toLowerCase())) {
    resultId = `${baseResultId}-${suffix}`;
    suffix += 1;
  }

  usedResultIds.add(resultId.toLowerCase());
  return resultId;
};

const completedExecution = (
  step: PipelineStep,
  reasonCodes: readonly string[],
): StageExecution => ({
  step,
  status: "completed",
  reasonCodes: [...reasonCodes],
});

const skippedExecution = (
  step: PipelineStep,
  reasonCode: "MISSING_VALIDATED_TRANSACTION" | "MISSING_FRAUD_ASSESSMENT",
): StageExecution => ({
  step,
  status: "skipped",
  reasonCodes: [reasonCode],
});

const createFinalResult = (state: PipelineState): PipelineResult => {
  const transactionId = state.canonicalResultId ?? state.fallbackTransactionId;

  if (state.validationFailure !== undefined) {
    return {
      transactionId,
      status: "rejected",
      reasonCodes: [...state.validationFailure.reasonCodes],
      explanation: "Transaction failed validation.",
      auditTrail: [...state.auditTrail],
      stageTrace: [...state.stageTrace],
    };
  }

  if (state.stageTrace.some(({ status }) => status === "skipped")) {
    return {
      transactionId,
      status: "rejected",
      reasonCodes: [DEPENDENCY_REASON_CODE],
      explanation: "Pipeline step dependencies were not satisfied.",
      ...(state.assessment === undefined
        ? {}
        : {
            riskScore: state.assessment.riskScore,
            riskFlags: [...state.assessment.riskFlags],
          }),
      auditTrail: [...state.auditTrail],
      stageTrace: [...state.stageTrace],
    };
  }

  if (state.assessment === undefined || state.compliance === undefined) {
    throw new TypeError("Complete pipeline state is missing a final decision.");
  }

  return {
    transactionId,
    status: state.compliance.status,
    reasonCodes: [...state.compliance.reasonCodes],
    explanation: state.compliance.explanation,
    riskScore: state.assessment.riskScore,
    riskFlags: [...state.assessment.riskFlags],
    auditTrail: [...state.auditTrail],
    stageTrace: [...state.stageTrace],
  };
};

const hasExactlyOneInputSource = (options: PipelineOptions): boolean =>
  (typeof options.inputFile === "string") !== Array.isArray(options.transactions);

export const runPipeline = async (
  options: PipelineOptions,
): Promise<PipelineSummary> => {
  const configuredPipeline = configurePipeline(options.steps);
  if (!configuredPipeline.valid) {
    throw new InvalidPipelineStepsError();
  }

  if (!hasExactlyOneInputSource(options)) {
    throw new PipelineSystemError();
  }

  try {
    const now = options.now ?? (() => new Date().toISOString());
    const createMessageId = options.createMessageId ?? randomUUID;

    await fileStore.clearPipelineDirectories(options.sharedRoot);

    const records =
      options.inputFile === undefined
        ? [...options.transactions]
        : await fileStore.readJson<unknown>(options.inputFile);
    if (!Array.isArray(records)) {
      throw new TypeError("Pipeline input must be a JSON array.");
    }

    const inputDirectory = join(options.sharedRoot, "input");
    const processingDirectory = join(options.sharedRoot, "processing");
    const outputDirectory = join(options.sharedRoot, "output");
    const resultsDirectory = join(options.sharedRoot, "results");
    const stageDirectories = [
      inputDirectory,
      processingDirectory,
      outputDirectory,
    ] as const;
    const seenTransactionIds = new Set<string>();
    const usedResultIds = new Set<string>(["summary"]);
    const outcomes: PipelineResult[] = [];

    for (const [index, record] of records.entries()) {
      const stageFileName = `record-${index}.json`;
      const fallbackTransactionId = `UNKNOWN-${index}`;
      const initialState: PipelineState = {
        rawTransaction: record,
        fallbackTransactionId,
        auditTrail: [],
        stageTrace: [],
      };

      const createStageHandlers = (): Record<PipelineStep, StageHandler> => ({
        "transaction-validator": (state) => {
          const validation = validateTransaction(state.rawTransaction, {
            seenTransactionIds,
            supportedCurrencies: options.config.supportedCurrencies,
            fallbackTransactionId,
          });
          const resultTransactionId = validation.valid
            ? validation.transaction.transactionId
            : validation.transactionId;
          const canonicalResultId = createCanonicalResultId(
            resultTransactionId,
            index,
            usedResultIds,
          );

          if (!validation.valid) {
            return {
              ...state,
              canonicalResultId,
              validationFailure: {
                transactionId: validation.transactionId,
                reasonCodes: [...validation.reasonCodes],
              },
              auditTrail: [
                ...state.auditTrail,
                createAuditEntry({
                  agentName: "transaction-validator",
                  transactionId: canonicalResultId,
                  outcome: "rejected",
                  reasonCodes: validation.reasonCodes,
                  now,
                }),
              ],
              stageTrace: [
                ...state.stageTrace,
                completedExecution(
                  "transaction-validator",
                  validation.reasonCodes,
                ),
              ],
            };
          }

          return {
            ...state,
            canonicalResultId,
            transaction: validation.transaction,
            auditTrail: [
              ...state.auditTrail,
              createAuditEntry({
                agentName: "transaction-validator",
                transactionId: canonicalResultId,
                outcome: "validated",
                reasonCodes: [],
                now,
              }),
            ],
            stageTrace: [
              ...state.stageTrace,
              completedExecution("transaction-validator", []),
            ],
          };
        },
        "fraud-detector": (state) => {
          if (state.transaction === undefined) {
            return {
              ...state,
              stageTrace: [
                ...state.stageTrace,
                skippedExecution(
                  "fraud-detector",
                  "MISSING_VALIDATED_TRANSACTION",
                ),
              ],
            };
          }

          const assessment = assessFraudRisk(state.transaction, options.config);
          return {
            ...state,
            assessment,
            auditTrail: [
              ...state.auditTrail,
              createAuditEntry({
                agentName: "fraud-detector",
                transactionId:
                  state.canonicalResultId ?? state.fallbackTransactionId,
                outcome: "assessed",
                reasonCodes: assessment.riskFlags,
                now,
              }),
            ],
            stageTrace: [
              ...state.stageTrace,
              completedExecution("fraud-detector", assessment.riskFlags),
            ],
          };
        },
        "compliance-checker": (state) => {
          if (state.transaction === undefined) {
            return {
              ...state,
              stageTrace: [
                ...state.stageTrace,
                skippedExecution(
                  "compliance-checker",
                  "MISSING_VALIDATED_TRANSACTION",
                ),
              ],
            };
          }

          if (state.assessment === undefined) {
            return {
              ...state,
              stageTrace: [
                ...state.stageTrace,
                skippedExecution(
                  "compliance-checker",
                  "MISSING_FRAUD_ASSESSMENT",
                ),
              ],
            };
          }

          const compliance = checkCompliance(
            state.transaction,
            state.assessment,
            options.config,
          );
          return {
            ...state,
            compliance,
            auditTrail: [
              ...state.auditTrail,
              createAuditEntry({
                agentName: "compliance-checker",
                transactionId:
                  state.canonicalResultId ?? state.fallbackTransactionId,
                outcome: compliance.status,
                reasonCodes: compliance.reasonCodes,
                now,
              }),
            ],
            stageTrace: [
              ...state.stageTrace,
              completedExecution("compliance-checker", compliance.reasonCodes),
            ],
          };
        },
      });

      const handlers = createStageHandlers();
      let currentPath = join(inputDirectory, stageFileName);
      await fileStore.writeJsonAtomic(
        currentPath,
        createMessage(
          initialState,
          "integrator",
          configuredPipeline.steps[0] as PipelineStep,
          now,
          createMessageId,
        ),
      );

      let currentState = initialState;
      for (const [stageIndex, step] of configuredPipeline.steps.entries()) {
        const storedMessage = await fileStore.readJson<
          PipelineMessage<PipelineState>
        >(currentPath);
        currentState = handlers[step](storedMessage.data);

        if (stageIndex < configuredPipeline.steps.length - 1) {
          const nextStep = configuredPipeline.steps[stageIndex + 1] as PipelineStep;
          const nextPath = join(stageDirectories[stageIndex + 1] as string, stageFileName);
          const nextMessage = createMessage(
            currentState,
            step,
            nextStep,
            now,
            createMessageId,
          );
          await fileStore.moveStageFile(currentPath, nextPath, nextMessage);
          currentPath = nextPath;
        }
      }

      const finalResult = createFinalResult(currentState);
      const resultPath = join(
        resultsDirectory,
        `${finalResult.transactionId}.json`,
      );
      await fileStore.moveStageFile(currentPath, resultPath, finalResult);
      outcomes.push(finalResult);
    }

    const summary = createSummary(outcomes);
    await fileStore.writeJsonAtomic(join(resultsDirectory, "summary.json"), summary);
    return summary;
  } catch (error) {
    if (error instanceof InvalidPipelineStepsError) {
      throw error;
    }

    throw new PipelineSystemError();
  }
};
