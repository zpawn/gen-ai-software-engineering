import { describe, expect, it } from "vitest";

import { configurePipeline } from "../../src/agents/pipeline-configurator.js";

const validOrders = [
  ["transaction-validator", "fraud-detector", "compliance-checker"],
  ["transaction-validator", "compliance-checker", "fraud-detector"],
  ["fraud-detector", "transaction-validator", "compliance-checker"],
  ["fraud-detector", "compliance-checker", "transaction-validator"],
  ["compliance-checker", "transaction-validator", "fraud-detector"],
  ["compliance-checker", "fraud-detector", "transaction-validator"],
] as const;

describe("configurePipeline", () => {
  it.each(validOrders)("preserves the valid order %j", (...steps) => {
    expect(configurePipeline(steps)).toEqual({
      valid: true,
      steps,
    });
  });

  it.each([
    ["a non-array value", "transaction-validator"],
    ["an empty order", []],
    [
      "a missing step",
      ["transaction-validator", "fraud-detector"],
    ],
    [
      "a duplicate step",
      ["transaction-validator", "fraud-detector", "fraud-detector"],
    ],
    [
      "an unknown step",
      ["transaction-validator", "fraud-detector", "settlement-processor"],
    ],
    [
      "an order longer than the supported pipeline",
      [
        "transaction-validator",
        "fraud-detector",
        "compliance-checker",
        "transaction-validator",
      ],
    ],
  ])("rejects %s", (_description, steps) => {
    expect(configurePipeline(steps)).toEqual({
      valid: false,
      code: "INVALID_PIPELINE_STEPS",
    });
  });

  it("returns a copy that cannot be changed through the caller array", () => {
    const steps = [
      "fraud-detector",
      "transaction-validator",
      "compliance-checker",
    ];

    const result = configurePipeline(steps);
    steps[0] = "changed-by-caller";

    expect(result).toEqual({
      valid: true,
      steps: [
        "fraud-detector",
        "transaction-validator",
        "compliance-checker",
      ],
    });
  });
});
