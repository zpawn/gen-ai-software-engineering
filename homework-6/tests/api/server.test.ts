import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveServerPaths } from "../../src/api/server.js";

describe("resolveServerPaths", () => {
  it("keeps POST storage and GET result paths under the same default shared root", () => {
    expect(resolveServerPaths({})).toEqual({
      sharedRoot: resolve("shared"),
      resultsDirectory: resolve("shared", "results"),
    });
  });

  it("uses an explicit shared root for both POST storage and default GET results", () => {
    const sharedRoot = resolve("custom-shared");
    expect(resolveServerPaths({ sharedRoot })).toEqual({
      sharedRoot,
      resultsDirectory: join(sharedRoot, "results"),
    });
  });

  it("derives the write root from an explicit results directory", () => {
    const resultsDirectory = resolve("custom-runtime", "results");
    expect(
      resolveServerPaths({
        resultsDirectory,
      }),
    ).toEqual({
      sharedRoot: dirname(resultsDirectory),
      resultsDirectory,
    });
  });

  it("rejects explicit paths that would split POST writes from GET reads", () => {
    expect(() =>
      resolveServerPaths({
        sharedRoot: "/runtime/shared",
        resultsDirectory: "/read-only/results",
      }),
    ).toThrow("Server paths must use the same pipeline results directory.");
  });
});
