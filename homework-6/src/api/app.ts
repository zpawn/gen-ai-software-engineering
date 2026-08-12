import Fastify, { type FastifyInstance } from "fastify";

import type {
  PipelineResult,
  PipelineSummary,
} from "../domain/pipeline-result.js";
import {
  ResultsRepositoryError,
  type ResultsRepositoryErrorCode,
  readPipelineSummary,
  readTransactionResult,
} from "../infrastructure/results-repository.js";

export interface AppOptions {
  resultsDirectory: string;
}

interface HealthReply {
  status: "ok";
}

interface TransactionParams {
  transactionId: string;
}

interface ErrorReply {
  code: ResultsRepositoryErrorCode;
  message: string;
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
  required: ["transactionId", "status", "reasonCodes", "explanation", "auditTrail"],
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

export const buildApp = ({ resultsDirectory }: AppOptions): FastifyInstance => {
  const app = Fastify({ logger: false });

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
