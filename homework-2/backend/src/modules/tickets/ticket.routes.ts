import type { FastifyInstance } from 'fastify';
import { createApplicationDatabase, createDatabase } from '../../config/database.js';
import { TicketClassifier } from './ticket.classifier.js';
import { TicketController } from './ticket.controller.js';
import { TicketImporter } from './ticket.importer.js';
import { TicketRepository } from './ticket.repository.js';
import {
  autoClassifyTicketSchema,
  createTicketSchema,
  importTicketSchema,
  listTicketsSchema,
  ticketParamsSchema,
  updateTicketSchema,
} from './ticket.schema.js';
import { TicketService } from './ticket.service.js';

export async function ticketRoutes(fastify: FastifyInstance): Promise<void> {
  const db = process.env.NODE_ENV === 'test' ? createDatabase() : createApplicationDatabase();
  const repository = new TicketRepository(db);
  const classifier = new TicketClassifier();
  const importer = new TicketImporter();
  const service = new TicketService(repository, classifier, importer);
  const controller = new TicketController(service);

  fastify.post('/tickets', {
    schema: createTicketSchema,
    handler: controller.createTicket,
  });

  fastify.post('/tickets/import', {
    schema: importTicketSchema,
    handler: controller.importTickets,
  });

  fastify.get('/tickets', {
    schema: listTicketsSchema,
    handler: controller.listTickets,
  });

  fastify.get('/tickets/:id', {
    schema: ticketParamsSchema,
    handler: controller.getTicket,
  });

  fastify.put('/tickets/:id', {
    schema: updateTicketSchema,
    handler: controller.updateTicket,
  });

  fastify.delete('/tickets/:id', {
    schema: ticketParamsSchema,
    handler: controller.deleteTicket,
  });

  fastify.post('/tickets/:id/auto-classify', {
    schema: autoClassifyTicketSchema,
    handler: controller.autoClassifyTicket,
  });

  fastify.get('/tickets/:id/classification-log', {
    schema: ticketParamsSchema,
    handler: controller.getClassificationLog,
  });
}
