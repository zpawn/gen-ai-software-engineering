export type TicketCategory =
  | 'account_access'
  | 'technical_issue'
  | 'billing_question'
  | 'feature_request'
  | 'bug_report'
  | 'other';

export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TicketStatus = 'new' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketSource = 'web_form' | 'email' | 'api' | 'chat' | 'phone';
export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface TicketMetadata {
  source: TicketSource;
  browser: string;
  device_type: DeviceType;
}

export interface Ticket {
  id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
  tags: string[];
  metadata: TicketMetadata;
  classification_confidence: number | null;
  classification_reasoning: string | null;
  classification_keywords: string[];
  classification_overridden: boolean;
}

export interface CreateTicketPayload {
  customer_id: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  description: string;
  tags: string[];
  metadata: TicketMetadata;
}

export interface ImportSummary {
  total_records: number;
  successful: number;
  failed: number;
  errors: Array<{
    record: number;
    error: string;
    details?: Array<{ field: string; message: string }>;
  }>;
  tickets: Ticket[];
}

export interface ClassificationResponse {
  ticket: Ticket;
  classification: {
    category: TicketCategory;
    priority: TicketPriority;
    confidence: number;
    reasoning: string;
    keywords_found: string[];
    decided_at: string;
  };
}
