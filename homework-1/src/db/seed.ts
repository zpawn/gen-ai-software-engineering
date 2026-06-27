import { db } from '../config/database.js';
import { transactions } from '../modules/transactions/transaction.model.js';

async function seed() {
  console.log('🌱 Seeding database with demo data...');

  const demoTransactions = [
    {
      id: 'tx-seed-00001',
      fromAccount: null,
      toAccount: 'ACC-12345',
      amount: 1000.00,
      currency: 'USD',
      type: 'deposit' as const,
      timestamp: '2026-06-01T08:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00002',
      fromAccount: null,
      toAccount: 'ACC-67890',
      amount: 2500.00,
      currency: 'USD',
      type: 'deposit' as const,
      timestamp: '2026-06-02T09:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00003',
      fromAccount: null,
      toAccount: 'ACC-ABCDE',
      amount: 1500.00,
      currency: 'EUR',
      type: 'deposit' as const,
      timestamp: '2026-06-03T10:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00004',
      fromAccount: 'ACC-12345',
      toAccount: 'ACC-67890',
      amount: 150.00,
      currency: 'USD',
      type: 'transfer' as const,
      timestamp: '2026-06-04T11:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00005',
      fromAccount: 'ACC-67890',
      toAccount: null,
      amount: 200.00,
      currency: 'USD',
      type: 'withdrawal' as const,
      timestamp: '2026-06-05T12:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00006',
      fromAccount: 'ACC-ABCDE',
      toAccount: 'ACC-12345',
      amount: 300.00,
      currency: 'EUR',
      type: 'transfer' as const,
      timestamp: '2026-06-06T13:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00007',
      fromAccount: null,
      toAccount: 'ACC-99999',
      amount: 800.00,
      currency: 'GBP',
      type: 'deposit' as const,
      timestamp: '2026-06-07T14:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00008',
      fromAccount: 'ACC-99999',
      toAccount: 'ACC-55555',
      amount: 1000.00, // exceeds balance, failed simulation
      currency: 'GBP',
      type: 'transfer' as const,
      timestamp: '2026-06-08T15:00:00.000Z',
      status: 'failed' as const,
    },
    {
      id: 'tx-seed-00009',
      fromAccount: 'ACC-12345',
      toAccount: null,
      amount: 50.00,
      currency: 'USD',
      type: 'withdrawal' as const,
      timestamp: '2026-06-09T16:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00010',
      fromAccount: null,
      toAccount: 'ACC-55555',
      amount: 1200.00,
      currency: 'GBP',
      type: 'deposit' as const,
      timestamp: '2026-06-10T17:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00011',
      fromAccount: 'ACC-55555',
      toAccount: null,
      amount: 150.75,
      currency: 'GBP',
      type: 'withdrawal' as const,
      timestamp: '2026-06-11T18:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00012',
      fromAccount: 'ACC-67890',
      toAccount: 'ACC-12345',
      amount: 450.00,
      currency: 'USD',
      type: 'transfer' as const,
      timestamp: '2026-06-12T19:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00013',
      fromAccount: null,
      toAccount: 'ACC-67890',
      amount: 600.00,
      currency: 'USD',
      type: 'deposit' as const,
      timestamp: '2026-06-13T20:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00014',
      fromAccount: 'ACC-12345',
      toAccount: 'ACC-67890',
      amount: 120.00,
      currency: 'USD',
      type: 'transfer' as const,
      timestamp: '2026-06-14T21:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00015',
      fromAccount: 'ACC-ABCDE',
      toAccount: null,
      amount: 5000.00, // exceeds balance, failed simulation
      currency: 'EUR',
      type: 'withdrawal' as const,
      timestamp: '2026-06-15T22:00:00.000Z',
      status: 'failed' as const,
    },
    {
      id: 'tx-seed-00016',
      fromAccount: null,
      toAccount: 'ACC-12345',
      amount: 400.00,
      currency: 'USD',
      type: 'deposit' as const,
      timestamp: '2026-06-16T23:00:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00017',
      fromAccount: 'ACC-ABCDE',
      toAccount: 'ACC-67890',
      amount: 80.50,
      currency: 'EUR',
      type: 'transfer' as const,
      timestamp: '2026-06-17T08:30:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00018',
      fromAccount: 'ACC-99999',
      toAccount: null,
      amount: 75.00,
      currency: 'GBP',
      type: 'withdrawal' as const,
      timestamp: '2026-06-18T09:30:00.000Z',
      status: 'completed' as const,
    },
    {
      id: 'tx-seed-00019',
      fromAccount: null,
      toAccount: 'ACC-67890',
      amount: 350.00,
      currency: 'USD',
      type: 'deposit' as const,
      timestamp: '2026-06-19T10:30:00.000Z',
      status: 'pending' as const,
    },
    {
      id: 'tx-seed-00020',
      fromAccount: 'ACC-55555',
      toAccount: 'ACC-99999',
      amount: 99.99,
      currency: 'GBP',
      type: 'transfer' as const,
      timestamp: '2026-06-20T11:30:00.000Z',
      status: 'completed' as const,
    },
  ];

  try {
    // Delete existing transactions to make the seed repeatable
    db.delete(transactions).run();

    // Insert demo data
    for (const tx of demoTransactions) {
      db.insert(transactions).values(tx).run();
    }
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
