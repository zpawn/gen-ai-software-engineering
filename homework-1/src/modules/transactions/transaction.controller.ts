import type { FastifyRequest, FastifyReply } from 'fastify';
import { TransactionService } from './transaction.service.js';

interface CreateTransactionBody {
  fromAccount?: string;
  toAccount?: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
}

interface TransactionParams {
  id: string;
}

interface AccountParams {
  accountId: string;
}

interface ListTransactionsQuery {
  accountId?: string;
  type?: string;
  from?: string;
  to?: string;
}

export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  /** POST /transactions */
  createTransaction = async (
    request: FastifyRequest<{ Body: CreateTransactionBody }>,
    reply: FastifyReply,
  ) => {
    const transaction = this.service.createTransaction(request.body);
    return reply.status(201).send(transaction);
  };

  /** GET /transactions */
  listTransactions = async (
    request: FastifyRequest<{ Querystring: ListTransactionsQuery }>,
    reply: FastifyReply,
  ) => {
    const transactions = this.service.listTransactions(request.query);
    return reply.status(200).send(transactions);
  };

  /** GET /transactions/:id */
  getTransaction = async (
    request: FastifyRequest<{ Params: TransactionParams }>,
    reply: FastifyReply,
  ) => {
    const transaction = this.service.getTransactionById(request.params.id);
    return reply.status(200).send(transaction);
  };

  /** GET /accounts/:accountId/balance */
  getBalance = async (
    request: FastifyRequest<{ Params: AccountParams }>,
    reply: FastifyReply,
  ) => {
    const balance = this.service.getBalance(request.params.accountId);
    return reply.status(200).send(balance);
  };

  /** GET /accounts/:accountId/summary */
  getSummary = async (
    request: FastifyRequest<{ Params: AccountParams }>,
    reply: FastifyReply,
  ) => {
    const summary = this.service.getAccountSummary(request.params.accountId);
    return reply.status(200).send(summary);
  };
}
