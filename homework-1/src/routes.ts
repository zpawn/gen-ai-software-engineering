import type { FastifyInstance } from 'fastify';
import { transactionRoutes } from './modules/transactions/transaction.routes.js';

/**
 * Central router to register all application route modules.
 * As the application grows, new route modules (e.g. users, cards)
 * should be registered here.
 */
export async function apiRoutes(fastify: FastifyInstance): Promise<void> {
  // Register transaction and account routes
  await fastify.register(transactionRoutes);
}
