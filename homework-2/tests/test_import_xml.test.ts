import { describe, expect, it } from '@jest/globals';
import { TicketImporter } from '../src/modules/tickets/ticket.importer.js';

describe('TicketImporter XML', () => {
  const importer = new TicketImporter();

  it('parses XML ticket elements', () => {
    const records = importer.parse({
      format: 'xml',
      content: `
        <tickets>
          <ticket>
            <customer_id>cust-xml-1</customer_id>
            <customer_email>xml@example.com</customer_email>
            <customer_name>XML User</customer_name>
            <subject>App crash</subject>
            <description>The mobile app crash happens on every login attempt.</description>
            <tags><tag>mobile</tag><tag>crash</tag></tags>
            <metadata><source>chat</source><browser>Safari</browser><device_type>mobile</device_type></metadata>
          </ticket>
        </tickets>`,
    });

    expect(records[0].customer_email).toBe('xml@example.com');
    expect(records[0].tags).toEqual(['mobile', 'crash']);
    expect(records[0].metadata?.device_type).toBe('mobile');
  });

  it('rejects XML without ticket elements', () => {
    expect(() => importer.parse({ format: 'xml', content: '<tickets></tickets>' })).toThrow(
      'XML import must contain at least one <ticket> element',
    );
  });
});
