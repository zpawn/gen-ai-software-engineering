import { randomUUID } from 'node:crypto';
import { TransactionRepository, type TransactionFilters } from './transaction.repository.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import type { Transaction, NewTransaction } from './transaction.model.js';

interface CreateTransactionInput {
  fromAccount?: string;
  toAccount?: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
}

interface BalanceResponse {
  accountId: string;
  balance: number;
  currency: string;
}

interface SummaryResponse {
  accountId: string;
  totalDeposits: number;
  totalWithdrawals: number;
  numberOfTransactions: number;
  mostRecentTransactionDate: string | null;
}

export class TransactionService {
  constructor(private readonly repository: TransactionRepository) {}

  /** Create a new transaction with business rule validation. */
  createTransaction(input: CreateTransactionInput): Transaction {
    const errors: { field: string; message: string }[] = [];

    // Validate max 2 decimal places
    if (!this.hasMaxTwoDecimals(input.amount)) {
      errors.push({ field: 'amount', message: 'Amount must have maximum 2 decimal places' });
    }

    // Validate accounts based on transaction type
    if (input.type === 'deposit') {
      if (!input.toAccount) {
        errors.push({ field: 'toAccount', message: 'toAccount is required for deposit transactions' });
      }
    } else if (input.type === 'withdrawal') {
      if (!input.fromAccount) {
        errors.push({ field: 'fromAccount', message: 'fromAccount is required for withdrawal transactions' });
      }
    } else if (input.type === 'transfer') {
      if (!input.fromAccount) {
        errors.push({ field: 'fromAccount', message: 'fromAccount is required for transfer transactions' });
      }
      if (!input.toAccount) {
        errors.push({ field: 'toAccount', message: 'toAccount is required for transfer transactions' });
      }
      if (input.fromAccount && input.toAccount && input.fromAccount === input.toAccount) {
        errors.push({ field: 'toAccount', message: 'fromAccount and toAccount must be different for transfers' });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const newTransaction: NewTransaction = {
      id: randomUUID(),
      fromAccount: input.fromAccount ?? null,
      toAccount: input.toAccount ?? null,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      type: input.type,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    return this.repository.create(newTransaction);
  }

  /** Get a single transaction by ID. */
  getTransactionById(id: string): Transaction {
    const transaction = this.repository.findById(id);
    if (!transaction) {
      throw new NotFoundError(`Transaction with id '${id}' not found`);
    }
    return transaction;
  }

  /** List transactions with optional filters. */
  listTransactions(filters: TransactionFilters): Transaction[] {
    return this.repository.findAll(filters);
  }

  /** Calculate account balance from transaction history. */
  getBalance(accountId: string): BalanceResponse {
    const accountTransactions = this.repository.findByAccountId(accountId);

    if (accountTransactions.length === 0) {
      throw new NotFoundError(`No transactions found for account '${accountId}'`);
    }

    let balance = 0;
    // Determine currency from the first transaction
    let currency = accountTransactions[0].currency;

    for (const tx of accountTransactions) {
      if (tx.status !== 'completed') continue;

      if (tx.type === 'deposit' && tx.toAccount === accountId) {
        balance += tx.amount;
      } else if (tx.type === 'withdrawal' && tx.fromAccount === accountId) {
        balance -= tx.amount;
      } else if (tx.type === 'transfer') {
        if (tx.fromAccount === accountId) balance -= tx.amount;
        if (tx.toAccount === accountId) balance += tx.amount;
      }
    }

    return {
      accountId,
      balance: Math.round(balance * 100) / 100,
      currency,
    };
  }

  /** Get account summary (Task 4A). */
  getAccountSummary(accountId: string): SummaryResponse {
    const accountTransactions = this.repository.findByAccountId(accountId);

    if (accountTransactions.length === 0) {
      throw new NotFoundError(`No transactions found for account '${accountId}'`);
    }

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let mostRecentDate: string | null = null;

    for (const tx of accountTransactions) {
      if (tx.status !== 'completed') continue;

      // Track most recent
      if (!mostRecentDate || tx.timestamp > mostRecentDate) {
        mostRecentDate = tx.timestamp;
      }

      // Deposits: money coming IN to this account
      if (tx.type === 'deposit' && tx.toAccount === accountId) {
        totalDeposits += tx.amount;
      }
      if (tx.type === 'transfer' && tx.toAccount === accountId) {
        totalDeposits += tx.amount;
      }

      // Withdrawals: money going OUT from this account
      if (tx.type === 'withdrawal' && tx.fromAccount === accountId) {
        totalWithdrawals += tx.amount;
      }
      if (tx.type === 'transfer' && tx.fromAccount === accountId) {
        totalWithdrawals += tx.amount;
      }
    }

    return {
      accountId,
      totalDeposits: Math.round(totalDeposits * 100) / 100,
      totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
      numberOfTransactions: accountTransactions.length,
      mostRecentTransactionDate: mostRecentDate,
    };
  }

  /** Check if a number has at most 2 decimal places. */
  private hasMaxTwoDecimals(n: number): boolean {
    return Math.round(n * 100) === n * 100;
  }
}
