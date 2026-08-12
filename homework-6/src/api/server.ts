import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

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
  sharedRoot?: string;
  resultsDirectory?: string;
}

export interface ServerPaths {
  sharedRoot: string;
  resultsDirectory: string;
}

export const resolveServerPaths = ({
  sharedRoot: requestedSharedRoot,
  resultsDirectory: requestedResultsDirectory,
}: Pick<ServerOptions, "sharedRoot" | "resultsDirectory">): ServerPaths => {
  const environmentSharedRoot = process.env.SHARED_ROOT;
  const environmentResultsDirectory = process.env.RESULTS_DIR;
  const resultsDirectory =
    requestedResultsDirectory ?? environmentResultsDirectory;
  const sharedRoot =
    requestedSharedRoot ??
    environmentSharedRoot ??
    (resultsDirectory === undefined ? resolve("shared") : dirname(resultsDirectory));
  const canonicalResultsDirectory = join(sharedRoot, "results");

  if (
    resultsDirectory !== undefined &&
    resolve(resultsDirectory) !== resolve(canonicalResultsDirectory)
  ) {
    throw new Error("Server paths must use the same pipeline results directory.");
  }

  return {
    sharedRoot,
    resultsDirectory: resultsDirectory ?? canonicalResultsDirectory,
  };
};

export const startServer = async ({
  host = process.env.HOST ?? DEFAULT_HOST,
  port = parsePort(process.env.PORT),
  sharedRoot,
  resultsDirectory,
}: ServerOptions = {}): Promise<void> => {
  const paths = resolveServerPaths({ sharedRoot, resultsDirectory });
  const app = buildApp(paths);

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
