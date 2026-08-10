import { describe, expect, it } from "vitest";

import {
  assessFraudRisk,
  type FraudConfig,
} from "../../src/agents/fraud-detector.js";
import type { ValidTransaction } from "../../src/domain/transaction.js";

const config = (overrides: Partial<FraudConfig> = {}): FraudConfig => ({
  highValueThreshold: "10000.00",
  unusualHourStart: 0,
  unusualHourEnd: 4,
  domesticCountry: "US",
  highValueWeight: 50,
  unusualTimeWeight: 25,
  crossBorderWeight: 25,
  ...overrides,
});

const transaction = (
  overrides: Partial<ValidTransaction> = {},
): ValidTransaction => ({
  transactionId: "TXN001",
  timestamp: "2026-03-16T05:00:00Z",
  sourceAccount: "ACC-1001",
  destinationAccount: "ACC-2001",
  amount: "1500.00",
  currency: "USD",
  transactionType: "transfer",
  country: "US",
  ...overrides,
});

describe("assessFraudRisk", () => {
  it("does not flag an amount equal to the high-value threshold", () => {
    expect(
      assessFraudRisk(transaction({ amount: "10000.00" }), config()),
    ).toEqual({
      riskScore: 0,
      riskFlags: [],
    });
  });

  it("flags an amount one cent above the high-value threshold", () => {
    expect(
      assessFraudRisk(transaction({ amount: "10000.01" }), config()),
    ).toEqual({
      riskScore: 50,
      riskFlags: ["HIGH_VALUE"],
    });
  });

  it.each([
    ["00", "2026-03-16T00:00:00Z"],
    ["04", "2026-03-16T04:59:59Z"],
  ])("flags UTC hour %s as unusual", (_hour, timestamp) => {
    expect(assessFraudRisk(transaction({ timestamp }), config())).toEqual({
      riskScore: 25,
      riskFlags: ["UNUSUAL_TIME"],
    });
  });

  it("does not flag the first UTC hour after the unusual-time window", () => {
    expect(
      assessFraudRisk(
        transaction({ timestamp: "2026-03-16T05:00:00Z" }),
        config(),
      ),
    ).toEqual({
      riskScore: 0,
      riskFlags: [],
    });
  });

  it("flags a transaction outside the configured domestic country", () => {
    expect(
      assessFraudRisk(transaction({ country: "CA" }), config()),
    ).toEqual({
      riskScore: 25,
      riskFlags: ["CROSS_BORDER"],
    });
  });

  it("does not flag a transaction in the configured domestic country", () => {
    expect(
      assessFraudRisk(transaction({ country: "US" }), config()),
    ).toEqual({
      riskScore: 0,
      riskFlags: [],
    });
  });

  it("caps the combined risk score at 100", () => {
    expect(
      assessFraudRisk(
        transaction({
          amount: "10000.01",
          timestamp: "2026-03-16T00:00:00Z",
          country: "CA",
        }),
        config({
          highValueWeight: 60,
          unusualTimeWeight: 30,
          crossBorderWeight: 30,
        }),
      ),
    ).toEqual({
      riskScore: 100,
      riskFlags: ["HIGH_VALUE", "UNUSUAL_TIME", "CROSS_BORDER"],
    });
  });

  it("uses configured factor weights before the score reaches the cap", () => {
    expect(
      assessFraudRisk(
        transaction({
          amount: "10000.01",
          timestamp: "2026-03-16T00:00:00Z",
          country: "CA",
        }),
        config({
          highValueWeight: 7,
          unusualTimeWeight: 11,
          crossBorderWeight: 13,
        }),
      ),
    ).toEqual({
      riskScore: 31,
      riskFlags: ["HIGH_VALUE", "UNUSUAL_TIME", "CROSS_BORDER"],
    });
  });
});
