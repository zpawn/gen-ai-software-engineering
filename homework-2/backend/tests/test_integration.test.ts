import { describe, expect, it } from '@jest/globals';
import { buildApp } from '../src/app.js';
import { ticketInput } from './helpers.js';

const API = '/api/v1';

describe('Integration workflows', () => {
  it('imports JSON records and auto-classifies them', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: `${API}/tickets/import`,
      payload: {
        format: 'json',
        auto_classify: true,
        records: [
          ticketInput({
            subject: 'Payment refund',
            description: 'Please refund a duplicate payment on my invoice.',
          }),
          ticketInput({
            customer_id: 'cust-invalid',
            customer_email: 'bad',
            subject: 'Bad',
            description: 'Too short',
          }),
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().total_records).toBe(2);
    expect(response.json().successful).toBe(1);
    expect(response.json().failed).toBe(1);
    expect(response.json().tickets[0].category).toBe('billing_question');
    await app.close();
  });

  it('logs classification decisions and protects manual overrides', async () => {
    const app = buildApp();
    const created = await app.inject({ method: 'POST', url: `${API}/tickets`, payload: ticketInput({ priority: 'low' }) });
    const id = created.json().id;

    const blocked = await app.inject({ method: 'POST', url: `${API}/tickets/${id}/auto-classify` });
    expect(blocked.statusCode).toBe(400);

    const forced = await app.inject({ method: 'POST', url: `${API}/tickets/${id}/auto-classify?force=true` });
    expect(forced.statusCode).toBe(200);
    expect(forced.json().classification.priority).toBe('urgent');

    const log = await app.inject({ method: 'GET', url: `${API}/tickets/${id}/classification-log` });
    expect(log.json()).toHaveLength(1);
    await app.close();
  });
});
