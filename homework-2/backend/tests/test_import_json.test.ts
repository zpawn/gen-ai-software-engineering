import { describe, expect, it } from '@jest/globals';
import { TicketImporter } from '../src/modules/tickets/ticket.importer.js';
import { ticketInput } from './helpers.js';

describe('TicketImporter JSON', () => {
  const importer = new TicketImporter();

  it('parses a JSON array', () => {
    const records = importer.parse({
      format: 'json',
      content: JSON.stringify([ticketInput({ customer_id: 'cust-json-1' })]),
    });

    expect(records[0].customer_id).toBe('cust-json-1');
  });

  it('parses an object with a tickets array', () => {
    const records = importer.parse({
      format: 'json',
      content: JSON.stringify({ tickets: [ticketInput({ subject: 'Invoice question' })] }),
    });

    expect(records).toHaveLength(1);
    expect(records[0].subject).toBe('Invoice question');
  });

  it('rejects malformed JSON', () => {
    expect(() => importer.parse({ format: 'json', content: '{bad json' })).toThrow('Malformed JSON import file');
  });
});
