import Decimal from "decimal.js";

import type { PipelineConfig } from "../config/pipeline-config.js";
import type {
  FraudAssessment,
  ValidTransaction,
} from "../domain/transaction.js";

export type FraudConfig = Pick<
  PipelineConfig,
  | "highValueThreshold"
  | "unusualHourStart"
  | "unusualHourEnd"
  | "domesticCountry"
  | "highValueWeight"
  | "unusualTimeWeight"
  | "crossBorderWeight"
>;

export function assessFraudRisk(
  transaction: ValidTransaction,
  config: FraudConfig,
): FraudAssessment {
  let riskScore = 0;
  const riskFlags: string[] = [];

  if (new Decimal(transaction.amount).gt(config.highValueThreshold)) {
    riskScore += config.highValueWeight;
    riskFlags.push("HIGH_VALUE");
  }

  const utcHour = new Date(transaction.timestamp).getUTCHours();
  if (
    utcHour >= config.unusualHourStart &&
    utcHour <= config.unusualHourEnd
  ) {
    riskScore += config.unusualTimeWeight;
    riskFlags.push("UNUSUAL_TIME");
  }

  if (transaction.country !== config.domesticCountry) {
    riskScore += config.crossBorderWeight;
    riskFlags.push("CROSS_BORDER");
  }

  return {
    riskScore: Math.min(100, riskScore),
    riskFlags,
  };
}
