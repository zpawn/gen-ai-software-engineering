import { describe, expect, it } from '@jest/globals';
import { TicketClassifier } from '../src/modules/tickets/ticket.classifier.js';
import { TicketImporter } from '../src/modules/tickets/ticket.importer.js';
import { TicketRepository } from '../src/modules/tickets/ticket.repository.js';
import { TicketService } from '../src/modules/tickets/ticket.service.js';
import { ValidationError } from '../src/shared/errors.js';
import { ticketInput } from './helpers.js';

function service() {
  return new TicketService(new TicketRepository(), new TicketClassifier(), new TicketImporter());
}

describe('Ticket model validation and lifecycle', () => {
  it('creates defaults for optional fields', () => {
    const ticket = service().createTicket(ticketInput({ metadata: undefined, tags: undefined }));

    expect(ticket.status).toBe('new');
    expect(ticket.category).toBe('other');
    expect(ticket.priority).toBe('medium');
    expect(ticket.metadata.source).toBe('api');
    expect(ticket.resolved_at).toBeNull();
  });

  it('validates email format', () => {
    expect(() => service().createTicket(ticketInput({ customer_email: 'bad-email' }))).toThrow(ValidationError);
  });

  it('validates description length', () => {
    expect(() => service().createTicket(ticketInput({ description: 'short' }))).toThrow(ValidationError);
  });

  it('sets resolved_at when status is resolved', () => {
    const ticket = service().createTicket(ticketInput({ status: 'resolved' }));

    expect(ticket.resolved_at).toEqual(expect.any(String));
  });

  it('marks manual classification override on update', () => {
    const svc = service();
    const created = svc.createTicket(ticketInput(), { autoClassify: true });
    const updated = svc.updateTicket(created.id, { priority: 'low' });

    expect(updated.classification_overridden).toBe(true);
    expect(updated.priority).toBe('low');
  });
});
