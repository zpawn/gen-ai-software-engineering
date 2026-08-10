import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";

import { createPipelineStatusServer } from "../../mcp/server.js";

const temporaryDirectories: string[] = [];
const openConnections: Array<{
  client: Client;
  server: ReturnType<typeof createPipelineStatusServer>;
}> = [];

const createResultsDirectory = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "hw6-mcp-server-"));
  temporaryDirectories.push(root);
  const resultsDirectory = join(root, "results");
  await mkdir(resultsDirectory);
  return resultsDirectory;
};

const connectClient = async (resultsDirectory: string): Promise<Client> => {
  const server = createPipelineStatusServer({ resultsDirectory });
  const client = new Client({ name: "hw6-mcp-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  openConnections.push({ client, server });
  return client;
};

const textContent = (result: unknown): string => {
  if (
    typeof result !== "object" ||
    result === null ||
    !("content" in result) ||
    !Array.isArray(result.content)
  ) {
    throw new Error("Expected an MCP content result.");
  }

  const first = result.content[0];
  if (
    typeof first !== "object" ||
    first === null ||
    !("type" in first) ||
    first.type !== "text" ||
    !("text" in first) ||
    typeof first.text !== "string"
  ) {
    throw new Error("Expected MCP text content.");
  }

  return first.text;
};

afterEach(async () => {
  await Promise.all(
    openConnections.splice(0).map(async ({ client, server }) => {
      await client.close();
      await server.close();
    }),
  );
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("pipeline status MCP server", () => {
  it("advertises the two read-only tools and summary resource", async () => {
    const client = await connectClient(await createResultsDirectory());

    const tools = await client.listTools();
    const resources = await client.listResources();

    expect(tools.tools.map(({ name }) => name)).toEqual([
      "get_transaction_status",
      "list_pipeline_results",
    ]);
    expect(resources.resources).toEqual([
      expect.objectContaining({
        name: "pipeline-summary",
        uri: "pipeline://summary",
        mimeType: "text/plain",
      }),
    ]);
  });

  it("returns a safe transaction status without private result fields", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "TXN001.json"),
      JSON.stringify({
        transactionId: "TXN001",
        status: "review",
        reasonCodes: ["HIGH_VALUE"],
        explanation: "PRIVATE-EXPLANATION-MARKER",
        riskScore: 50,
        riskFlags: ["HIGH_VALUE"],
        auditTrail: [],
      }),
    );
    const client = await connectClient(resultsDirectory);

    const response = await client.callTool({
      name: "get_transaction_status",
      arguments: { transaction_id: "TXN001" },
    });

    expect(response.isError).not.toBe(true);
    expect(JSON.parse(textContent(response))).toEqual({
      transactionId: "TXN001",
      status: "review",
      reasonCodes: ["HIGH_VALUE"],
      riskScore: 50,
      riskFlags: ["HIGH_VALUE"],
    });
    expect(JSON.stringify(response)).not.toContain("PRIVATE-EXPLANATION-MARKER");
    expect(JSON.stringify(response)).not.toContain("auditTrail");
  });

  it("returns the same latest counters through the summary tool and resource", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "summary.json"),
      JSON.stringify({ total: 8, approved: 3, review: 3, rejected: 2 }),
    );
    const client = await connectClient(resultsDirectory);

    const toolResponse = await client.callTool({
      name: "list_pipeline_results",
      arguments: {},
    });
    const resourceResponse = await client.readResource({
      uri: "pipeline://summary",
    });

    expect(JSON.parse(textContent(toolResponse))).toEqual({
      total: 8,
      approved: 3,
      review: 3,
      rejected: 2,
    });
    expect(resourceResponse.contents).toEqual([
      {
        uri: "pipeline://summary",
        mimeType: "text/plain",
        text: "Pipeline summary: total=8, approved=3, review=3, rejected=2.",
      },
    ]);
  });

  it("returns controlled tool errors for invalid or absent transaction IDs", async () => {
    const resultsDirectory = await createResultsDirectory();
    const client = await connectClient(resultsDirectory);

    const invalidInput = await client.callTool({
      name: "get_transaction_status",
      arguments: {},
    });
    const absentResult = await client.callTool({
      name: "get_transaction_status",
      arguments: { transaction_id: "../PRIVATE-PATH-MARKER" },
    });

    expect(invalidInput.isError).toBe(true);
    expect(absentResult.isError).toBe(true);
    expect(textContent(absentResult)).toBe("Transaction result not found.");
    expect(JSON.stringify(absentResult)).not.toContain("PRIVATE-PATH-MARKER");
    expect(JSON.stringify(absentResult)).not.toContain(resultsDirectory);
  });

  it("blocks shape-valid private markers from transaction tool responses", async () => {
    const resultsDirectory = await createResultsDirectory();
    const privateMarker = "ACCOUNT: 123456789";
    await writeFile(
      join(resultsDirectory, "TXN-UNSAFE.json"),
      JSON.stringify({
        transactionId: "TXN-UNSAFE",
        status: "review",
        reasonCodes: ["RISK_SCORE_AT_OR_ABOVE_REVIEW_THRESHOLD"],
        explanation: "Review.",
        riskScore: 50,
        riskFlags: [privateMarker],
        auditTrail: [],
      }),
    );
    const client = await connectClient(resultsDirectory);

    const response = await client.callTool({
      name: "get_transaction_status",
      arguments: { transaction_id: "TXN-UNSAFE" },
    });

    expect(response.isError).toBe(true);
    expect(textContent(response)).toBe("Unable to read pipeline results.");
    expect(JSON.stringify(response)).not.toContain(privateMarker);
    expect(JSON.stringify(response)).not.toContain(resultsDirectory);
  });

  it("rejects inconsistent summary counters through both MCP surfaces", async () => {
    const resultsDirectory = await createResultsDirectory();
    await writeFile(
      join(resultsDirectory, "summary.json"),
      JSON.stringify({ total: 1, approved: 2, review: 0, rejected: 0 }),
    );
    const client = await connectClient(resultsDirectory);

    const toolResponse = await client.callTool({
      name: "list_pipeline_results",
      arguments: {},
    });

    expect(toolResponse.isError).toBe(true);
    expect(textContent(toolResponse)).toBe("Unable to read pipeline results.");
    await expect(
      client.readResource({ uri: "pipeline://summary" }),
    ).rejects.toThrow("Unable to read pipeline results.");
  });

  it("returns a safe protocol error when the summary is unavailable", async () => {
    const client = await connectClient(await createResultsDirectory());

    await expect(
      client.readResource({ uri: "pipeline://summary" }),
    ).rejects.toThrow("Pipeline summary not found.");
  });
});
