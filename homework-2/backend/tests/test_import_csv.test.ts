import { describe, expect, it } from '@jest/globals';
import { ParseError } from '../src/shared/errors.js';
import { TicketImporter } from '../src/modules/tickets/ticket.importer.js';

describe('TicketImporter CSV', () => {
  const importer = new TicketImporter();

  it('parses CSV records with metadata and tags', () => {
    const records = importer.parse({
      format: 'csv',
      content:
        'customer_id,customer_email,customer_name,subject,description,tags,metadata.source,metadata.browser,metadata.device_type\n' +
        'cust-1,ada@example.com,Ada,"Cannot access account","I cannot access account after reset",login|auth,web_form,Firefox,desktop',
    });

    expect(records).toHaveLength(1);
    expect(records[0].tags).toEqual(['login', 'auth']);
    expect(records[0].metadata?.source).toBe('web_form');
  });

  it('reports malformed CSV quotes', () => {
    expect(() =>
      importer.parse({
        format: 'csv',
        content: 'customer_email,subject,description\n"ada@example.com,Broken,Missing close quote',
      }),
    ).toThrow(ParseError);
  });

  it('requires key CSV columns', () => {
    expect(() =>
      importer.parse({
        format: 'csv',
        content: 'customer_id,subject\ncust-1,No email',
      }),
    ).toThrow('CSV header is missing required columns');
  });
});
