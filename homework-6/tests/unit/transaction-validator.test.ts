import { describe, expect, it } from "vitest";

import {
  validateTransaction,
  type ValidationContext,
} from "../../src/agents/transaction-validator.js";
import type { ValidTransaction } from "../../src/domain/transaction.js";

const context = (): ValidationContext => ({
  seenTransactionIds: new Set<string>(),
  supportedCurrencies: new Set(["USD", "EUR", "GBP", "JPY"]),
  fallbackTransactionId: "UNKNOWN-0001",
});

const rawTransaction = (overrides: Record<string, unknown> = {}) => ({
  transaction_id: "TXN001",
  timestamp: "2026-03-16T09:00:00Z",
  source_account: "ACC-1001",
  destination_account: "ACC-2001",
  amount: "1500.00",
  currency: "usd",
  transaction_type: "transfer",
  metadata: {
    channel: "online",
    country: "US",
  },
  description: "Private description that must not leak",
  ...overrides,
});

describe("validateTransaction", () => {
  it("normalizes a valid raw transaction without converting its amount to a number", () => {
    const result = validateTransaction(rawTransaction(), context());

    const expected: ValidTransaction = {
      transactionId: "TXN001",
      timestamp: "2026-03-16T09:00:00Z",
      sourceAccount: "ACC-1001",
      destinationAccount: "ACC-2001",
      amount: "1500.00",
      currency: "USD",
      transactionType: "transfer",
      country: "US",
    };

    expect(result).toEqual({ valid: true, transaction: expected });
  });

  it("returns stable missing-field reason codes and the configured fallback ID", () => {
    const result = validateTransaction({}, context());

    expect(result).toEqual({
      valid: false,
      transactionId: "UNKNOWN-0001",
      reasonCodes: [
        "MISSING_TRANSACTION_ID",
        "MISSING_TIMESTAMP",
        "MISSING_SOURCE_ACCOUNT",
        "MISSING_DESTINATION_ACCOUNT",
        "MISSING_AMOUNT",
        "MISSING_CURRENCY",
        "MISSING_TRANSACTION_TYPE",
        "MISSING_COUNTRY",
      ],
    });
  });

  it("rejects malformed timestamps without throwing or exposing the raw record", () => {
    const payload = rawTransaction({ timestamp: "not-a-timestamp" });

    expect(validateTransaction(payload, context())).toEqual({
      valid: false,
      transactionId: "TXN001",
      reasonCodes: ["INVALID_TIMESTAMP"],
    });
  });

  it("rejects timestamps that include a non-UTC offset", () => {
    const result = validateTransaction(
      rawTransaction({ timestamp: "2026-03-16T10:00:00+01:00" }),
      context(),
    );

    expect(result).toEqual({
      valid: false,
      transactionId: "TXN001",
      reasonCodes: ["NON_UTC_TIMESTAMP"],
    });
  });

  it("rejects malformed, zero, and negative decimal amounts with stable codes", () => {
    expect(
      validateTransaction(rawTransaction({ amount: "12.3.4" }), context()),
    ).toEqual({
      valid: false,
      transactionId: "TXN001",
      reasonCodes: ["INVALID_AMOUNT"],
    });

    expect(validateTransaction(rawTransaction({ amount: "0.00" }), context())).toEqual({
      valid: false,
      transactionId: "TXN001",
      reasonCodes: ["NON_POSITIVE_AMOUNT"],
    });

    expect(
      validateTransaction(rawTransaction({ amount: "-100.00" }), context()),
    ).toEqual({
      valid: false,
      transactionId: "TXN001",
      reasonCodes: ["NON_POSITIVE_AMOUNT"],
    });
  });

  it("rejects the sample unsupported currency without returning payload data", () => {
    const result = validateTransaction(
      rawTransaction({
        transaction_id: "TXN006",
        currency: "XYZ",
        source_account: "PRIVATE-SOURCE",
      }),
      context(),
    );

    expect(result).toEqual({
      valid: false,
      transactionId: "TXN006",
      reasonCodes: ["UNSUPPORTED_CURRENCY"],
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE-SOURCE");
    expect(JSON.stringify(result)).not.toContain("Private description");
  });

  it("rejects a duplicate transaction ID and does not overwrite the first ID", () => {
    const validationContext = context();

    expect(validateTransaction(rawTransaction(), validationContext)).toMatchObject({
      valid: true,
    });

    expect(validateTransaction(rawTransaction(), validationContext)).toEqual({
      valid: false,
      transactionId: "TXN001",
      reasonCodes: ["DUPLICATE_TRANSACTION_ID"],
    });
  });

  it("reserves a non-empty ID after an invalid first record", () => {
    const validationContext = context();

    expect(
      validateTransaction(
        rawTransaction({ source_account: undefined }),
        validationContext,
      ),
    ).toEqual({
      valid: false,
      transactionId: "TXN001",
      reasonCodes: ["MISSING_SOURCE_ACCOUNT"],
    });

    expect(validateTransaction(rawTransaction(), validationContext)).toEqual({
      valid: false,
      transactionId: "TXN001",
      reasonCodes: ["DUPLICATE_TRANSACTION_ID"],
    });
  });

  it("returns a safe validation result for non-object user data", () => {
    const result = validateTransaction(null, context());

    expect(result).toEqual({
      valid: false,
      transactionId: "UNKNOWN-0001",
      reasonCodes: ["INVALID_TRANSACTION"],
    });
    expect(JSON.stringify(result)).not.toContain("null");
  });
});
