import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ResultsRepositoryError } from "../src/infrastructure/results-repository.js";
import {
  getPipelineSummaryResource,
  getTransactionStatus,
  listPipelineResults,
} from "./handlers.js";

export interface PipelineStatusServerOptions {
  resultsDirectory: string;
}

const safeErrorMessage = (error: unknown): string => {
  if (error instanceof ResultsRepositoryError) {
    switch (error.code) {
      case "TRANSACTION_NOT_FOUND":
        return "Transaction result not found.";
      case "SUMMARY_NOT_FOUND":
        return "Pipeline summary not found.";
      case "RESULTS_READ_ERROR":
        return "Unable to read pipeline results.";
    }
  }

  return "Unable to read pipeline results.";
};

const jsonContent = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

const errorContent = (error: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: safeErrorMessage(error) }],
});

export const createPipelineStatusServer = ({
  resultsDirectory,
}: PipelineStatusServerOptions): McpServer => {
  const server = new McpServer({
    name: "hw6-pipeline-status",
    version: "1.0.0",
  });

  server.registerTool(
    "get_transaction_status",
    {
      description: "Get a safe final transaction status.",
      inputSchema: { transaction_id: z.string().min(1) },
    },
    async ({ transaction_id }) => {
      try {
        return jsonContent(
          await getTransactionStatus(resultsDirectory, transaction_id),
        );
      } catch (error) {
        return errorContent(error);
      }
    },
  );

  server.registerTool(
    "list_pipeline_results",
    {
      description: "List the latest pipeline result counters.",
    },
    async () => {
      try {
        return jsonContent(await listPipelineResults(resultsDirectory));
      } catch (error) {
        return errorContent(error);
      }
    },
  );

  server.registerResource(
    "pipeline-summary",
    "pipeline://summary",
    { mimeType: "text/plain" },
    async (uri) => {
      try {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: await getPipelineSummaryResource(resultsDirectory),
            },
          ],
        };
      } catch (error) {
        throw new Error(safeErrorMessage(error));
      }
    },
  );

  return server;
};
