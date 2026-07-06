import type { ClassificationDecision, TicketCategory, TicketPriority } from './ticket.model.js';

interface KeywordRule<T> {
  value: T;
  keywords: string[];
  reasoning: string;
}

const CATEGORY_RULES: KeywordRule<TicketCategory>[] = [
  {
    value: 'account_access',
    keywords: ['login', 'password', '2fa', 'two-factor', 'cannot access', "can't access", 'locked out', 'sign in'],
    reasoning: 'The ticket describes account access, authentication, or login problems.',
  },
  {
    value: 'billing_question',
    keywords: ['payment', 'invoice', 'refund', 'charge', 'billing', 'subscription'],
    reasoning: 'The ticket contains payment, invoice, refund, or subscription language.',
  },
  {
    value: 'bug_report',
    keywords: ['bug', 'reproduce', 'steps to reproduce', 'expected', 'actual', 'defect', 'broken'],
    reasoning: 'The ticket describes a defect or includes reproduction language.',
  },
  {
    value: 'technical_issue',
    keywords: ['error', 'crash', 'timeout', 'loading', 'server', 'failed', 'technical'],
    reasoning: 'The ticket reports a technical failure or application error.',
  },
  {
    value: 'feature_request',
    keywords: ['feature', 'enhancement', 'suggestion', 'request', 'add', 'improve'],
    reasoning: 'The ticket requests a product improvement or new capability.',
  },
];

const PRIORITY_RULES: KeywordRule<TicketPriority>[] = [
  {
    value: 'urgent',
    keywords: ["can't access", 'cannot access', 'critical', 'production down', 'security'],
    reasoning: 'Urgent keywords indicate severe access, security, or production impact.',
  },
  {
    value: 'high',
    keywords: ['important', 'blocking', 'asap'],
    reasoning: 'High-priority keywords indicate blocking or time-sensitive work.',
  },
  {
    value: 'low',
    keywords: ['minor', 'cosmetic', 'suggestion'],
    reasoning: 'Low-priority keywords indicate cosmetic or non-blocking work.',
  },
];

export interface ClassificationInput {
  subject: string;
  description: string;
}

export class TicketClassifier {
  classify(input: ClassificationInput): ClassificationDecision {
    const text = `${input.subject} ${input.description}`.toLowerCase();
    const categoryMatch = this.firstRuleMatch(CATEGORY_RULES, text);
    const priorityMatch = this.firstRuleMatch(PRIORITY_RULES, text);

    const category = categoryMatch?.rule.value ?? 'other';
    const priority = priorityMatch?.rule.value ?? 'medium';
    const keywords = [...(categoryMatch?.keywords ?? []), ...(priorityMatch?.keywords ?? [])];
    const categoryReason = categoryMatch?.rule.reasoning ?? 'No category-specific keywords were found.';
    const priorityReason = priorityMatch?.rule.reasoning ?? 'No priority keywords were found, so medium priority was assigned.';
    const confidence = this.calculateConfidence(categoryMatch?.keywords.length ?? 0, priorityMatch?.keywords.length ?? 0);

    return {
      category,
      priority,
      confidence,
      reasoning: `${categoryReason} ${priorityReason}`,
      keywords_found: [...new Set(keywords)],
      decided_at: new Date().toISOString(),
    };
  }

  private firstRuleMatch<T>(
    rules: KeywordRule<T>[],
    text: string,
  ): { rule: KeywordRule<T>; keywords: string[] } | undefined {
    for (const rule of rules) {
      const keywords = rule.keywords.filter((keyword) => text.includes(keyword));
      if (keywords.length > 0) {
        return { rule, keywords };
      }
    }

    return undefined;
  }

  private calculateConfidence(categoryMatches: number, priorityMatches: number): number {
    const raw = 0.45 + categoryMatches * 0.15 + priorityMatches * 0.1;
    return Math.min(0.95, Math.round(raw * 100) / 100);
  }
}
