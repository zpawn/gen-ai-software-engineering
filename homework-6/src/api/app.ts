import Fastify, { type FastifyInstance } from "fastify";
import { dirname } from "node:path";

import { configurePipeline } from "../agents/pipeline-configurator.js";
import {
  DEFAULT_PIPELINE_CONFIG,
  type PipelineConfig,
} from "../config/pipeline-config.js";
import type {
  PipelineResult,
  PipelineSummary,
} from "../domain/pipeline-result.js";
import type { PipelineStep } from "../domain/pipeline-step.js";
import {
  ResultsRepositoryError,
  type ResultsRepositoryErrorCode,
  readPipelineSummary,
  readTransactionResult,
} from "../infrastructure/results-repository.js";
import { runPipeline } from "../integrator.js";

export interface AppOptions {
  resultsDirectory: string;
  sharedRoot?: string;
  config?: PipelineConfig;
  pipelineRunner?: typeof runPipeline;
}

interface HealthReply {
  status: "ok";
}

interface TransactionParams {
  transactionId: string;
}

interface ErrorReply {
  code: ResultsRepositoryErrorCode | "INVALID_PIPELINE_STEPS" | "PIPELINE_BUSY" | "PIPELINE_SYSTEM_ERROR" | "INVALID_PIPELINE_REQUEST";
  message: string;
}

interface PipelineRunBody {
  steps: string[];
  transactions: unknown[];
}

interface PipelineRunReplies {
  200: { summary: PipelineSummary };
  400: ErrorReply;
  409: ErrorReply;
  500: ErrorReply;
}

interface TransactionReplies {
  200: PipelineResult;
  404: ErrorReply;
  500: ErrorReply;
}

interface SummaryReplies {
  200: PipelineSummary;
  404: ErrorReply;
  500: ErrorReply;
}

const errorResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["code", "message"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
  },
} as const;

const auditEntrySchema = {
  type: "object",
  additionalProperties: false,
  required: ["timestamp", "agent_name", "transaction_id", "outcome", "reason_codes"],
  properties: {
    timestamp: { type: "string" },
    agent_name: { type: "string" },
    transaction_id: { type: "string" },
    outcome: { type: "string" },
    reason_codes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const pipelineResultSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "transactionId",
    "status",
    "reasonCodes",
    "explanation",
    "auditTrail",
    "stageTrace",
  ],
  properties: {
    transactionId: { type: "string" },
    status: { type: "string", enum: ["approved", "review", "rejected"] },
    reasonCodes: {
      type: "array",
      items: { type: "string" },
    },
    explanation: { type: "string" },
    riskScore: { type: "number" },
    riskFlags: {
      type: "array",
      items: { type: "string" },
    },
    auditTrail: {
      type: "array",
      items: auditEntrySchema,
    },
    stageTrace: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step", "status", "reasonCodes"],
        properties: {
          step: {
            type: "string",
            enum: [
              "transaction-validator",
              "fraud-detector",
              "compliance-checker",
            ],
          },
          status: { type: "string", enum: ["completed", "skipped"] },
          reasonCodes: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const pipelineSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["total", "approved", "review", "rejected"],
  properties: {
    total: { type: "integer" },
    approved: { type: "integer" },
    review: { type: "integer" },
    rejected: { type: "integer" },
  },
} as const;

const toErrorReply = (error: ResultsRepositoryError): ErrorReply => ({
  code: error.code,
  message: error.message,
});

const isNotFoundError = (error: ResultsRepositoryError): boolean =>
  error.code === "TRANSACTION_NOT_FOUND" || error.code === "SUMMARY_NOT_FOUND";

const isValidationError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "validation" in error &&
  error.validation !== undefined;

export const buildApp = ({
  resultsDirectory,
  sharedRoot = dirname(resultsDirectory),
  config = DEFAULT_PIPELINE_CONFIG,
  pipelineRunner = runPipeline,
}: AppOptions): FastifyInstance => {
  const app = Fastify({ logger: false });
  let pipelineRunActive = false;

  app.setErrorHandler((error, request, reply) => {
    if (
      request.method === "POST" &&
      request.url === "/pipeline/run" &&
      isValidationError(error)
    ) {
      return reply.code(400).send({
        code: "INVALID_PIPELINE_REQUEST",
        message: "Pipeline run request is invalid.",
      });
    }

    return reply.code(500).send({
      code: "PIPELINE_SYSTEM_ERROR",
      message: "Pipeline execution failed.",
    });
  });
  app.post<{ Body: PipelineRunBody; Reply: PipelineRunReplies }>(
    "/pipeline/run",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["steps", "transactions"],
          properties: {
            steps: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "string",
              },
            },
            transactions: { type: "array" },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["summary"],
            properties: { summary: pipelineSummarySchema },
          },
          400: errorResponseSchema,
          409: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const configuredPipeline = configurePipeline(request.body.steps);
      if (!configuredPipeline.valid) {
        return reply.code(400).send({
          code: "INVALID_PIPELINE_STEPS",
          message: "Pipeline steps must contain every supported step exactly once.",
        });
      }

      if (pipelineRunActive) {
        return reply.code(409).send({
          code: "PIPELINE_BUSY",
          message: "A pipeline run is already in progress.",
        });
      }

      pipelineRunActive = true;
      try {
        const summary = await pipelineRunner({
          transactions: request.body.transactions,
          steps: configuredPipeline.steps,
          sharedRoot,
          config,
        });
        return { summary };
      } catch {
        return reply.code(500).send({
          code: "PIPELINE_SYSTEM_ERROR",
          message: "Pipeline execution failed.",
        });
      } finally {
        pipelineRunActive = false;
      }
    },
  );

  app.get<{ Reply: HealthReply }>(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["status"],
            properties: {
              status: { type: "string", enum: ["ok"] },
            },
          },
        },
      },
    },
    async () => ({ status: "ok" }),
  );

  app.get<{ Params: TransactionParams; Reply: TransactionReplies }>(
    "/transactions/:transactionId",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["transactionId"],
          properties: {
            transactionId: { type: "string" },
          },
        },
        response: {
          200: pipelineResultSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await readTransactionResult(resultsDirectory, request.params.transactionId);
      } catch (error) {
        if (error instanceof ResultsRepositoryError) {
          return reply
            .code(isNotFoundError(error) ? 404 : 500)
            .send(toErrorReply(error));
        }

        return reply.code(500).send({
          code: "RESULTS_READ_ERROR",
          message: "Unable to read pipeline results.",
        });
      }
    },
  );

  app.get<{ Reply: SummaryReplies }>(
    "/summary",
    {
      schema: {
        response: {
          200: pipelineSummarySchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      try {
        return await readPipelineSummary(resultsDirectory);
      } catch (error) {
        if (error instanceof ResultsRepositoryError) {
          return reply
            .code(isNotFoundError(error) ? 404 : 500)
            .send(toErrorReply(error));
        }

        return reply.code(500).send({
          code: "RESULTS_READ_ERROR",
          message: "Unable to read pipeline results.",
        });
      }
    },
  );

  return app;
};
