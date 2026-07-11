import type { CreateTicketInput } from '../src/modules/tickets/ticket.model.js';

export function ticketInput(overrides: Partial<CreateTicketInput> = {}): CreateTicketInput {
  return {
    customer_id: 'cust-001',
    customer_email: 'ada@example.com',
    customer_name: 'Ada Lovelace',
    subject: 'Cannot access my account',
    description: 'I cannot access my account after the password reset flow.',
    tags: ['login'],
    metadata: {
      source: 'web_form',
      browser: 'Firefox',
      device_type: 'desktop',
    },
    ...overrides,
  };
}
