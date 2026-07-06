import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ImportPayload } from './ticket.importer.js';
import type { CreateTicketInput, TicketFilters, UpdateTicketInput } from './ticket.model.js';
import { TicketService } from './ticket.service.js';

interface TicketParams {
  id: string;
}

interface AutoClassifyQuery {
  force?: boolean | string;
}

interface AutoClassifyBody {
  force?: boolean;
}

interface CreateQuery {
  auto_classify?: boolean | string;
}

export class TicketController {
  constructor(private readonly service: TicketService) {}

  createTicket = async (
    request: FastifyRequest<{ Body: CreateTicketInput; Querystring: CreateQuery }>,
    reply: FastifyReply,
  ) => {
    const ticket = this.service.createTicket(request.body, {
      autoClassify: this.toBoolean(request.query.auto_classify),
    });
    return reply.status(201).send(ticket);
  };

  importTickets = async (
    request: FastifyRequest<{ Body: ImportPayload & { auto_classify?: boolean } }>,
    reply: FastifyReply,
  ) => {
    const summary = this.service.importTickets(request.body);
    return reply.status(201).send(summary);
  };

  listTickets = async (
    request: FastifyRequest<{ Querystring: TicketFilters }>,
    reply: FastifyReply,
  ) => {
    return reply.status(200).send(this.service.listTickets(request.query));
  };

  getTicket = async (
    request: FastifyRequest<{ Params: TicketParams }>,
    reply: FastifyReply,
  ) => {
    return reply.status(200).send(this.service.getTicketById(request.params.id));
  };

  updateTicket = async (
    request: FastifyRequest<{ Params: TicketParams; Body: UpdateTicketInput }>,
    reply: FastifyReply,
  ) => {
    return reply.status(200).send(this.service.updateTicket(request.params.id, request.body));
  };

  deleteTicket = async (
    request: FastifyRequest<{ Params: TicketParams }>,
    reply: FastifyReply,
  ) => {
    this.service.deleteTicket(request.params.id);
    return reply.status(204).send();
  };

  autoClassifyTicket = async (
    request: FastifyRequest<{ Params: TicketParams; Querystring: AutoClassifyQuery; Body?: AutoClassifyBody }>,
    reply: FastifyReply,
  ) => {
    const result = this.service.autoClassifyTicket(request.params.id, {
      force: this.toBoolean(request.query.force) || request.body?.force === true,
    });
    return reply.status(200).send(result);
  };

  getClassificationLog = async (
    request: FastifyRequest<{ Params: TicketParams }>,
    reply: FastifyReply,
  ) => {
    return reply.status(200).send(this.service.getClassificationLog(request.params.id));
  };

  private toBoolean(value: boolean | string | undefined): boolean {
    return value === true || value === 'true' || value === '1';
  }
}
