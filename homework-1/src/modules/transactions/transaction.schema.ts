import { VALID_CURRENCIES, VALID_TYPES, ACCOUNT_PATTERN } from '../../shared/constants.js';

// --- POST /transactions ---

export const createTransactionSchema = {
  body: {
    type: 'object' as const,
    required: ['amount', 'currency', 'type'],
    additionalProperties: false,
    properties: {
      fromAccount: { type: 'string', pattern: ACCOUNT_PATTERN },
      toAccount: { type: 'string', pattern: ACCOUNT_PATTERN },
      amount: { type: 'number', exclusiveMinimum: 0 },
      currency: { type: 'string', enum: [...VALID_CURRENCIES] },
      type: { type: 'string', enum: [...VALID_TYPES] },
    },
  },
  response: {
    201: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        fromAccount: { type: ['string', 'null'] },
        toAccount: { type: ['string', 'null'] },
        amount: { type: 'number' },
        currency: { type: 'string' },
        type: { type: 'string' },
        timestamp: { type: 'string' },
        status: { type: 'string' },
      },
    },
  },
};

// --- GET /transactions ---

export const listTransactionsSchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      accountId: { type: 'string' },
      type: { type: 'string', enum: [...VALID_TYPES] },
      from: { type: 'string' },
      to: { type: 'string' },
    },
  },
};

// --- GET /transactions/:id ---

export const getTransactionSchema = {
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
};

// --- GET /accounts/:accountId/balance ---

export const getBalanceSchema = {
  params: {
    type: 'object' as const,
    required: ['accountId'],
    properties: {
      accountId: { type: 'string', pattern: ACCOUNT_PATTERN },
    },
  },
};

// --- GET /accounts/:accountId/summary ---

export const getSummarySchema = {
  params: {
    type: 'object' as const,
    required: ['accountId'],
    properties: {
      accountId: { type: 'string', pattern: ACCOUNT_PATTERN },
    },
  },
};
