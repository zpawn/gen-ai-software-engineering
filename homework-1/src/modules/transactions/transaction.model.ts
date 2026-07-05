import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  fromAccount: text('from_account'),
  toAccount: text('to_account'),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  type: text('type', { enum: ['deposit', 'withdrawal', 'transfer'] }).notNull(),
  timestamp: text('timestamp').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull().default('completed'),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
