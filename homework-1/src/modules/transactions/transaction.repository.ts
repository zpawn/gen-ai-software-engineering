import { db } from '../../config/database.js';
import { transactions, type Transaction, type NewTransaction } from './transaction.model.js';
import { eq, and, or, gte, lte } from 'drizzle-orm';

export interface TransactionFilters {
  accountId?: string;
  type?: string;
  from?: string;
  to?: string;
}

export class TransactionRepository {
  /** Insert a new transaction and return it. */
  create(data: NewTransaction): Transaction {
    db.insert(transactions).values(data).run();
    return this.findById(data.id!)!;
  }

  /** Find a transaction by its ID. */
  findById(id: string): Transaction | undefined {
    return db.select().from(transactions).where(eq(transactions.id, id)).get();
  }

  /** List transactions with optional filters. */
  findAll(filters: TransactionFilters = {}): Transaction[] {
    const conditions = [];

    if (filters.accountId) {
      conditions.push(
        or(
          eq(transactions.fromAccount, filters.accountId),
          eq(transactions.toAccount, filters.accountId),
        ),
      );
    }

    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }

    if (filters.from) {
      conditions.push(gte(transactions.timestamp, filters.from));
    }

    if (filters.to) {
      // Add "T23:59:59" to include the full end day when only date is provided
      const toValue = filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to;
      conditions.push(lte(transactions.timestamp, toValue));
    }

    if (conditions.length === 0) {
      return db.select().from(transactions).all();
    }

    return db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .all();
  }

  /** Find all transactions involving a specific account. */
  findByAccountId(accountId: string): Transaction[] {
    return db
      .select()
      .from(transactions)
      .where(
        or(
          eq(transactions.fromAccount, accountId),
          eq(transactions.toAccount, accountId),
        ),
      )
      .all();
  }
}
