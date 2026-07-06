import type {
  DEVICE_TYPES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  TICKET_STATUSES,
} from '../../shared/constants.js';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketSource = (typeof TICKET_SOURCES)[number];
export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface TicketMetadata {
  source: TicketSource;
  browser: string;
  device_type: DeviceType;
}

export interface ClassificationDecision {
  category: TicketCategory;
  priority: TicketPriority;
  confidence: number;
  reasoning: string;
  keywords_found: string[];
  decided_at: string;
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

export interface CreateTicketInput {
  customer_id: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  resolved_at?: string | null;
  assigned_to?: string | null;
  tags?: string[];
  metadata?: Partial<TicketMetadata>;
}

export type UpdateTicketInput = Partial<CreateTicketInput>;

export interface TicketFilters {
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  customer_id?: string;
  customer_email?: string;
  assigned_to?: string;
  source?: TicketSource;
  tag?: string;
}

export const tickets = sqliteTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    customer_id: text('customer_id').notNull(),
    customer_email: text('customer_email').notNull(),
    customer_name: text('customer_name').notNull(),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    priority: text('priority').notNull(),
    status: text('status').notNull(),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
    resolved_at: text('resolved_at'),
    assigned_to: text('assigned_to'),
    tags: text('tags').notNull().default('[]'),
    metadata: text('metadata').notNull(),
    classification_confidence: real('classification_confidence'),
    classification_reasoning: text('classification_reasoning'),
    classification_keywords: text('classification_keywords').notNull().default('[]'),
    classification_overridden: integer('classification_overridden', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('tickets_category_idx').on(table.category),
    index('tickets_priority_idx').on(table.priority),
    index('tickets_status_idx').on(table.status),
    index('tickets_customer_email_idx').on(table.customer_email),
  ],
);

export const classificationDecisions = sqliteTable(
  'classification_decisions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ticket_id: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    priority: text('priority').notNull(),
    confidence: real('confidence').notNull(),
    reasoning: text('reasoning').notNull(),
    keywords_found: text('keywords_found').notNull().default('[]'),
    decided_at: text('decided_at').notNull(),
  },
  (table) => [index('classification_ticket_idx').on(table.ticket_id)],
);

export type TicketRow = typeof tickets.$inferSelect;
export type NewTicketRow = typeof tickets.$inferInsert;
export type ClassificationDecisionRow = typeof classificationDecisions.$inferSelect;
