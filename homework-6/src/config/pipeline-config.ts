export interface PipelineConfig {
  supportedCurrencies: ReadonlySet<string>;
  domesticCountry: string;
  highValueThreshold: string;
  unusualHourStart: number;
  unusualHourEnd: number;
  highValueWeight: number;
  unusualTimeWeight: number;
  crossBorderWeight: number;
  reviewThreshold: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  supportedCurrencies: new Set(["USD", "EUR", "GBP", "JPY"]),
  domesticCountry: "US",
  highValueThreshold: "10000.00",
  unusualHourStart: 0,
  unusualHourEnd: 4,
  highValueWeight: 50,
  unusualTimeWeight: 25,
  crossBorderWeight: 25,
  reviewThreshold: 50
};
