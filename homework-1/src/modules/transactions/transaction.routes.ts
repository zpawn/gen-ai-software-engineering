import type { FastifyInstance } from 'fastify';
import { TransactionController } from './transaction.controller.js';
import { TransactionService } from './transaction.service.js';
import { TransactionRepository } from './transaction.repository.js';
import {
  createTransactionSchema,
  listTransactionsSchema,
  getTransactionSchema,
  getBalanceSchema,
  getSummarySchema,
} from './transaction.schema.js';

export async function transactionRoutes(fastify: FastifyInstance): Promise<void> {
  // Wire up dependencies
  const repository = new TransactionRepository();
  const service = new TransactionService(repository);
  const controller = new TransactionController(service);

  // --- Transaction endpoints ---

  fastify.post('/transactions', {
    schema: createTransactionSchema,
    handler: controller.createTransaction,
  });

  fastify.get('/transactions', {
    schema: listTransactionsSchema,
    handler: controller.listTransactions,
  });

  fastify.get('/transactions/:id', {
    schema: getTransactionSchema,
    handler: controller.getTransaction,
  });

  // --- Account endpoints ---

  fastify.get('/accounts/:accountId/balance', {
    schema: getBalanceSchema,
    handler: controller.getBalance,
  });

  fastify.get('/accounts/:accountId/summary', {
    schema: getSummarySchema,
    handler: controller.getSummary,
  });
}
