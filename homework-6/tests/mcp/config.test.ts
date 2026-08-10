import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, describe, expect, it } from "vitest";

interface StdioServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface ProjectMcpConfig {
  mcpServers: {
    context7: StdioServerConfig;
    "pipeline-status": StdioServerConfig;
  };
}

const temporaryDirectories: string[] = [];
const openClients: Client[] = [];

const readProjectConfig = async (): Promise<ProjectMcpConfig> =>
  JSON.parse(await import("node:fs/promises").then(({ readFile }) =>
    readFile(".mcp.json", "utf8"),
  )) as ProjectMcpConfig;

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Claude Code MCP configuration", () => {
  it("defines only the required Context7 and local pipeline status servers", async () => {
    const config = await readProjectConfig();

    expect(Object.keys(config.mcpServers)).toEqual([
      "context7",
      "pipeline-status",
    ]);
    expect(config.mcpServers.context7).toEqual({
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });
    expect(config.mcpServers["pipeline-status"]).toEqual({
      command: "node",
      args: ["--import", "tsx", "mcp/stdio.ts"],
      env: { RESULTS_DIR: "shared/results" },
    });
  });

  it("starts the configured pipeline server over stdio and serves actual results", async () => {
    const root = await mkdtemp(join(tmpdir(), "hw6-mcp-stdio-"));
    temporaryDirectories.push(root);
    const resultsDirectory = join(root, "results");
    await mkdir(resultsDirectory);
    await writeFile(
      join(resultsDirectory, "summary.json"),
      JSON.stringify({ total: 5, approved: 2, review: 2, rejected: 1 }),
    );

    const config = await readProjectConfig();
    const server = config.mcpServers["pipeline-status"];
    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args,
      cwd: process.cwd(),
      env: {
        ...getDefaultEnvironment(),
        ...server.env,
        RESULTS_DIR: resultsDirectory,
      },
      stderr: "pipe",
    });
    const client = new Client({
      name: "hw6-mcp-stdio-test-client",
      version: "1.0.0",
    });
    openClients.push(client);
    await client.connect(transport);

    const response = await client.callTool({
      name: "list_pipeline_results",
      arguments: {},
    });

    expect(response.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          total: 5,
          approved: 2,
          review: 2,
          rejected: 1,
        }),
      },
    ]);
  });
});
