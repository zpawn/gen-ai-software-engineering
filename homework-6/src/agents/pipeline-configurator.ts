import {
  PIPELINE_STEPS,
  type PipelineConfigurationResult,
  type PipelineStep,
} from "../domain/pipeline-step.js";

const supportedSteps = new Set<string>(PIPELINE_STEPS);

export const configurePipeline = (
  steps: unknown,
): PipelineConfigurationResult => {
  if (
    !Array.isArray(steps) ||
    steps.length !== PIPELINE_STEPS.length ||
    !steps.every(
      (step): step is PipelineStep =>
        typeof step === "string" && supportedSteps.has(step),
    ) ||
    new Set(steps).size !== PIPELINE_STEPS.length
  ) {
    return { valid: false, code: "INVALID_PIPELINE_STEPS" };
  }

  return { valid: true, steps: [...steps] };
};
