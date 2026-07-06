import { describe, expect, it } from '@jest/globals';
import { TicketClassifier } from '../src/modules/tickets/ticket.classifier.js';

describe('TicketClassifier', () => {
  const classifier = new TicketClassifier();

  it('classifies account access tickets as urgent when access is blocked', () => {
    const result = classifier.classify({
      subject: 'Cannot access production account',
      description: 'I cannot access the admin account and this is critical.',
    });

    expect(result.category).toBe('account_access');
    expect(result.priority).toBe('urgent');
    expect(result.keywords_found).toContain('cannot access');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('classifies billing language', () => {
    const result = classifier.classify({
      subject: 'Refund request',
      description: 'The last invoice has a duplicate subscription charge.',
    });

    expect(result.category).toBe('billing_question');
    expect(result.priority).toBe('medium');
  });

  it('classifies low priority suggestions as feature requests', () => {
    const result = classifier.classify({
      subject: 'Suggestion for dashboard',
      description: 'Minor suggestion to improve dashboard filters.',
    });

    expect(result.category).toBe('feature_request');
    expect(result.priority).toBe('low');
  });

  it('falls back to other and medium for uncategorized text', () => {
    const result = classifier.classify({
      subject: 'General question',
      description: 'I would like to know more about my workspace settings.',
    });

    expect(result.category).toBe('other');
    expect(result.priority).toBe('medium');
  });
});
