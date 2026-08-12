import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createPipelineStatusServer } from "./server.js";

const resultsDirectory = resolve(
  process.env.RESULTS_DIR ?? "shared/results",
);
const server = createPipelineStatusServer({ resultsDirectory });

await server.connect(new StdioServerTransport());
