import Decimal from "decimal.js";

import type {
  ValidTransaction,
  ValidationFailure,
  ValidationResult,
} from "../domain/transaction.js";

export interface ValidationContext {
  seenTransactionIds: Set<string>;
  supportedCurrencies: ReadonlySet<string>;
  fallbackTransactionId: string;
}

type RawRecord = Record<string, unknown>;

const DECIMAL_STRING_PATTERN = /^-?\d+(?:\.\d+)?$/;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function failure(
  transactionId: string,
  reasonCodes: string[],
): ValidationFailure {
  return { valid: false, transactionId, reasonCodes };
}

function hasValidUtcTimestamp(value: string): boolean {
  if (!UTC_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const fractionMatch = value.match(/\.(\d{1,3})Z$/);
  const canonicalValue = fractionMatch
    ? value.replace(/\.(\d{1,3})Z$/, (_, fraction: string) => {
        return `.${fraction.padEnd(3, "0")}Z`;
      })
    : value.replace(/Z$/, ".000Z");

  return date.toISOString() === canonicalValue;
}

function isNonUtcTimestamp(value: string): boolean {
  return !value.endsWith("Z") && !Number.isNaN(Date.parse(value));
}

function isSupportedCurrency(
  currency: string,
  supportedCurrencies: ReadonlySet<string>,
): boolean {
  const normalizedCurrency = currency.toUpperCase();
  for (const supportedCurrency of supportedCurrencies) {
    if (supportedCurrency.toUpperCase() === normalizedCurrency) {
      return true;
    }
  }
  return false;
}

export function validateTransaction(
  transaction: unknown,
  context: ValidationContext,
): ValidationResult {
  if (!isRecord(transaction)) {
    return failure(context.fallbackTransactionId, ["INVALID_TRANSACTION"]);
  }

  const transactionId = isNonEmptyString(transaction.transaction_id)
    ? transaction.transaction_id
    : context.fallbackTransactionId;
  const hasTransactionId = isNonEmptyString(transaction.transaction_id);
  const isDuplicateTransactionId =
    hasTransactionId && context.seenTransactionIds.has(transactionId);
  if (hasTransactionId && !isDuplicateTransactionId) {
    context.seenTransactionIds.add(transactionId);
  }
  const reasonCodes: string[] = [];

  if (!isNonEmptyString(transaction.transaction_id)) {
    reasonCodes.push(
      transaction.transaction_id === undefined || transaction.transaction_id === ""
        ? "MISSING_TRANSACTION_ID"
        : "INVALID_TRANSACTION_ID",
    );
  }

  const requiredStringFields: Array<{
    key:
      | "timestamp"
      | "source_account"
      | "destination_account"
      | "amount"
      | "currency"
      | "transaction_type";
    missingCode: string;
    invalidCode: string;
  }> = [
    {
      key: "timestamp",
      missingCode: "MISSING_TIMESTAMP",
      invalidCode: "INVALID_TIMESTAMP",
    },
    {
      key: "source_account",
      missingCode: "MISSING_SOURCE_ACCOUNT",
      invalidCode: "INVALID_SOURCE_ACCOUNT",
    },
    {
      key: "destination_account",
      missingCode: "MISSING_DESTINATION_ACCOUNT",
      invalidCode: "INVALID_DESTINATION_ACCOUNT",
    },
    { key: "amount", missingCode: "MISSING_AMOUNT", invalidCode: "INVALID_AMOUNT" },
    {
      key: "currency",
      missingCode: "MISSING_CURRENCY",
      invalidCode: "INVALID_CURRENCY",
    },
    {
      key: "transaction_type",
      missingCode: "MISSING_TRANSACTION_TYPE",
      invalidCode: "INVALID_TRANSACTION_TYPE",
    },
  ];

  for (const field of requiredStringFields) {
    const value = transaction[field.key];
    if (value === undefined || value === "") {
      reasonCodes.push(field.missingCode);
    } else if (!isNonEmptyString(value)) {
      reasonCodes.push(field.invalidCode);
    }
  }

  const metadata = transaction.metadata;
  const country = isRecord(metadata) ? metadata.country : undefined;
  if (country === undefined || country === "") {
    reasonCodes.push("MISSING_COUNTRY");
  } else if (!isNonEmptyString(country)) {
    reasonCodes.push("INVALID_COUNTRY");
  }

  if (reasonCodes.length > 0) {
    return failure(transactionId, reasonCodes);
  }

  if (isDuplicateTransactionId) {
    return failure(transactionId, ["DUPLICATE_TRANSACTION_ID"]);
  }

  const timestamp = transaction.timestamp as string;
  if (!hasValidUtcTimestamp(timestamp)) {
    return failure(
      transactionId,
      [isNonUtcTimestamp(timestamp) ? "NON_UTC_TIMESTAMP" : "INVALID_TIMESTAMP"],
    );
  }

  const amount = transaction.amount as string;
  if (!DECIMAL_STRING_PATTERN.test(amount)) {
    return failure(transactionId, ["INVALID_AMOUNT"]);
  }

  let decimalAmount: Decimal;
  try {
    decimalAmount = new Decimal(amount);
  } catch {
    return failure(transactionId, ["INVALID_AMOUNT"]);
  }

  if (!decimalAmount.gt(new Decimal("0"))) {
    return failure(transactionId, ["NON_POSITIVE_AMOUNT"]);
  }

  const currency = (transaction.currency as string).toUpperCase();
  if (!isSupportedCurrency(currency, context.supportedCurrencies)) {
    return failure(transactionId, ["UNSUPPORTED_CURRENCY"]);
  }

  return {
    valid: true,
    transaction: {
      transactionId,
      timestamp,
      sourceAccount: transaction.source_account as string,
      destinationAccount: transaction.destination_account as string,
      amount,
      currency,
      transactionType: transaction.transaction_type as string,
      country: country as string,
    } satisfies ValidTransaction,
  };
}
