import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { buildApp } from "./app.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

const parsePort = (value: string | undefined): number => {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  return Number.isInteger(port) && port >= 0 && port <= 65535
    ? port
    : DEFAULT_PORT;
};

export interface ServerOptions {
  host?: string;
  port?: number;
  resultsDirectory?: string;
}

export const startServer = async ({
  host = process.env.HOST ?? DEFAULT_HOST,
  port = parsePort(process.env.PORT),
  resultsDirectory = process.env.RESULTS_DIR ?? resolve("shared", "results"),
}: ServerOptions = {}): Promise<void> => {
  const app = buildApp({ resultsDirectory });

  try {
    await app.listen({ host, port });
  } catch {
    process.exitCode = 1;
    console.error(
      JSON.stringify({
        event: "api_startup_failed",
        code: "API_STARTUP_FAILED",
      }),
    );
    await app.close();
  }
};

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  void startServer();
}
