import type { FastifyInstance } from 'fastify';
import { ticketRoutes } from './modules/tickets/ticket.routes.js';

export async function apiRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(ticketRoutes);
}
