export const TICKET_CATEGORIES = [
  'account_access',
  'technical_issue',
  'billing_question',
  'feature_request',
  'bug_report',
  'other',
] as const;

export const TICKET_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;

export const TICKET_STATUSES = [
  'new',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const;

export const TICKET_SOURCES = ['web_form', 'email', 'api', 'chat', 'phone'] as const;

export const DEVICE_TYPES = ['desktop', 'mobile', 'tablet'] as const;

export const EMAIL_PATTERN = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';

export const SUBJECT_MIN_LENGTH = 1;
export const SUBJECT_MAX_LENGTH = 200;
export const DESCRIPTION_MIN_LENGTH = 10;
export const DESCRIPTION_MAX_LENGTH = 2000;
