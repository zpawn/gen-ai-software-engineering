import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { checkCompliance } from "./agents/compliance-checker.js";
import { assessFraudRisk } from "./agents/fraud-detector.js";
import { validateTransaction } from "./agents/transaction-validator.js";
import type { PipelineConfig } from "./config/pipeline-config.js";
import type { PipelineMessage } from "./domain/pipeline-message.js";
import type {
  AuditEntry,
  PipelineResult,
  PipelineSummary,
} from "./domain/pipeline-result.js";
import type { FraudAssessment, ValidTransaction } from "./domain/transaction.js";
import { createAuditEntry } from "./infrastructure/audit-logger.js";
import * as fileStore from "./infrastructure/file-store.js";

export interface PipelineOptions {
  inputFile: string;
  sharedRoot: string;
  config: PipelineConfig;
  now?: () => string;
  createMessageId?: () => string;
}

export class PipelineSystemError extends Error {
  public readonly code = "PIPELINE_SYSTEM_ERROR";

  public constructor() {
    super("Pipeline execution failed.");
    this.name = "PipelineSystemError";
  }
}

interface FraudStageData {
  transaction: ValidTransaction;
  assessment: FraudAssessment;
}

const SAFE_FILENAME_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

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

const createRejectedResult = (
  transactionId: string,
  reasonCodes: string[],
  auditTrail: AuditEntry[],
): PipelineResult => ({
  transactionId,
  status: "rejected",
  reasonCodes: [...reasonCodes],
  explanation: "Transaction failed validation.",
  auditTrail,
});

const createFinalResult = (
  transactionId: string,
  transaction: ValidTransaction,
  assessment: FraudAssessment,
  compliance: ReturnType<typeof checkCompliance>,
  auditTrail: AuditEntry[],
): PipelineResult => ({
  transactionId,
  status: compliance.status,
  reasonCodes: [...compliance.reasonCodes],
  explanation: compliance.explanation,
  riskScore: assessment.riskScore,
  riskFlags: [...assessment.riskFlags],
  auditTrail,
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

export const runPipeline = async (
  options: PipelineOptions,
): Promise<PipelineSummary> => {
  try {
    const now = options.now ?? (() => new Date().toISOString());
    const createMessageId = options.createMessageId ?? randomUUID;

    await fileStore.clearPipelineDirectories(options.sharedRoot);

    const records = await fileStore.readJson<unknown>(options.inputFile);
    if (!Array.isArray(records)) {
      throw new TypeError("Pipeline input must be a JSON array.");
    }

    const inputDirectory = join(options.sharedRoot, "input");
    const processingDirectory = join(options.sharedRoot, "processing");
    const outputDirectory = join(options.sharedRoot, "output");
    const resultsDirectory = join(options.sharedRoot, "results");
    const seenTransactionIds = new Set<string>();
    const usedResultIds = new Set<string>(["summary"]);
    const outcomes: PipelineResult[] = [];

    for (const [index, record] of records.entries()) {
      const stageFileName = `record-${index}.json`;
      const inputPath = join(inputDirectory, stageFileName);
      const processingPath = join(processingDirectory, stageFileName);
      const outputPath = join(outputDirectory, stageFileName);

      const inputMessage = createMessage(
        record,
        "integrator",
        "transaction-validator",
        now,
        createMessageId,
      );
      await fileStore.writeJsonAtomic(inputPath, inputMessage);

      const storedInputMessage = await fileStore.readJson<PipelineMessage<unknown>>(
        inputPath,
      );
      const validation = validateTransaction(storedInputMessage.data, {
        seenTransactionIds,
        supportedCurrencies: options.config.supportedCurrencies,
        fallbackTransactionId: `UNKNOWN-${index}`,
      });
      const resultTransactionId = validation.valid
        ? validation.transaction.transactionId
        : validation.transactionId;
      const canonicalResultId = createCanonicalResultId(
        resultTransactionId,
        index,
        usedResultIds,
      );
      const resultPath = join(resultsDirectory, `${canonicalResultId}.json`);

      if (!validation.valid) {
        const auditTrail = [
          createAuditEntry({
            agentName: "transaction-validator",
            transactionId: canonicalResultId,
            outcome: "rejected",
            reasonCodes: validation.reasonCodes,
            now,
          }),
        ];
        const rejectedResult = createRejectedResult(
          canonicalResultId,
          validation.reasonCodes,
          auditTrail,
        );
        await fileStore.moveStageFile(inputPath, resultPath, rejectedResult);
        outcomes.push(rejectedResult);
        continue;
      }

      const auditTrail = [
        createAuditEntry({
          agentName: "transaction-validator",
          transactionId: canonicalResultId,
          outcome: "validated",
          reasonCodes: [],
          now,
        }),
      ];
      const processingMessage = createMessage(
        validation.transaction,
        "transaction-validator",
        "fraud-detector",
        now,
        createMessageId,
      );
      await fileStore.moveStageFile(inputPath, processingPath, processingMessage);

      const storedProcessingMessage = await fileStore.readJson<
        PipelineMessage<ValidTransaction>
      >(processingPath);
      const assessment = assessFraudRisk(
        storedProcessingMessage.data,
        options.config,
      );
      auditTrail.push(
        createAuditEntry({
          agentName: "fraud-detector",
          transactionId: canonicalResultId,
          outcome: "assessed",
          reasonCodes: assessment.riskFlags,
          now,
        }),
      );
      const outputMessage = createMessage<FraudStageData>(
        {
          transaction: storedProcessingMessage.data,
          assessment,
        },
        "fraud-detector",
        "compliance-checker",
        now,
        createMessageId,
      );
      await fileStore.moveStageFile(processingPath, outputPath, outputMessage);

      const storedOutputMessage = await fileStore.readJson<
        PipelineMessage<FraudStageData>
      >(outputPath);
      const compliance = checkCompliance(
        storedOutputMessage.data.transaction,
        storedOutputMessage.data.assessment,
        options.config,
      );
      auditTrail.push(
        createAuditEntry({
          agentName: "compliance-checker",
          transactionId: canonicalResultId,
          outcome: compliance.status,
          reasonCodes: compliance.reasonCodes,
          now,
        }),
      );
      const finalResult = createFinalResult(
        canonicalResultId,
        storedOutputMessage.data.transaction,
        storedOutputMessage.data.assessment,
        compliance,
        auditTrail,
      );
      await fileStore.moveStageFile(outputPath, resultPath, finalResult);
      outcomes.push(finalResult);
    }

    const summary = createSummary(outcomes);
    await fileStore.writeJsonAtomic(join(resultsDirectory, "summary.json"), summary);
    return summary;
  } catch {
    throw new PipelineSystemError();
  }
};
