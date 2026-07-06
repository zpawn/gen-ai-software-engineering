import { describe, expect, it } from '@jest/globals';
import { buildApp } from '../src/app.js';
import { ticketInput } from './helpers.js';

const API = '/api/v1';

describe('Performance baseline', () => {
  it('handles 20 concurrent creates', async () => {
    const app = buildApp();
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        app.inject({
          method: 'POST',
          url: `${API}/tickets?auto_classify=true`,
          payload: ticketInput({
            customer_id: `cust-${index}`,
            customer_email: `customer-${index}@example.com`,
          }),
        }),
      ),
    );

    expect(responses.every((response) => response.statusCode === 201)).toBe(true);
    const list = await app.inject({ method: 'GET', url: `${API}/tickets` });
    expect(list.json()).toHaveLength(20);
    await app.close();
  });
});
