import { describe, expect, it } from '@jest/globals';
import { buildApp } from '../src/app.js';
import { ticketInput } from './helpers.js';

const API = '/api/v1';

describe('Ticket API', () => {
  it('creates and fetches a ticket', async () => {
    const app = buildApp();
    const create = await app.inject({
      method: 'POST',
      url: `${API}/tickets?auto_classify=true`,
      payload: ticketInput(),
    });

    expect(create.statusCode).toBe(201);
    const ticket = create.json();
    expect(ticket.category).toBe('account_access');

    const get = await app.inject({ method: 'GET', url: `${API}/tickets/${ticket.id}` });
    expect(get.statusCode).toBe(200);
    expect(get.json().id).toBe(ticket.id);
    await app.close();
  });

  it('lists tickets with combined filters', async () => {
    const app = buildApp();
    await app.inject({ method: 'POST', url: `${API}/tickets?auto_classify=true`, payload: ticketInput() });
    await app.inject({
      method: 'POST',
      url: `${API}/tickets`,
      payload: ticketInput({
        customer_id: 'cust-2',
        customer_email: 'billing@example.com',
        subject: 'Invoice refund',
        description: 'Please refund the duplicate invoice charge.',
        category: 'billing_question',
        priority: 'high',
      }),
    });

    const response = await app.inject({ method: 'GET', url: `${API}/tickets?category=billing_question&priority=high` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
    expect(response.json()[0].customer_id).toBe('cust-2');
    await app.close();
  });

  it('updates and deletes a ticket', async () => {
    const app = buildApp();
    const create = await app.inject({ method: 'POST', url: `${API}/tickets`, payload: ticketInput() });
    const id = create.json().id;

    const update = await app.inject({
      method: 'PUT',
      url: `${API}/tickets/${id}`,
      payload: { status: 'waiting_customer', assigned_to: 'agent-1' },
    });

    expect(update.statusCode).toBe(200);
    expect(update.json().assigned_to).toBe('agent-1');

    const del = await app.inject({ method: 'DELETE', url: `${API}/tickets/${id}` });
    expect(del.statusCode).toBe(204);

    const missing = await app.inject({ method: 'GET', url: `${API}/tickets/${id}` });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });

  it('returns validation errors for invalid creates', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: `${API}/tickets`,
      payload: ticketInput({ customer_email: 'not-an-email' }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('Validation failed');
    await app.close();
  });
});
