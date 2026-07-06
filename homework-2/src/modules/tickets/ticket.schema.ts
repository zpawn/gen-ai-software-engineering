import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  DEVICE_TYPES,
  EMAIL_PATTERN,
  SUBJECT_MAX_LENGTH,
  SUBJECT_MIN_LENGTH,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  TICKET_STATUSES,
} from '../../shared/constants.js';

const metadataSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    source: { type: 'string', enum: [...TICKET_SOURCES] },
    browser: { type: 'string' },
    device_type: { type: 'string', enum: [...DEVICE_TYPES] },
  },
};

const ticketBodyProperties = {
  customer_id: { type: 'string', minLength: 1 },
  customer_email: { type: 'string', pattern: EMAIL_PATTERN },
  customer_name: { type: 'string', minLength: 1 },
  subject: { type: 'string', minLength: SUBJECT_MIN_LENGTH, maxLength: SUBJECT_MAX_LENGTH },
  description: { type: 'string', minLength: DESCRIPTION_MIN_LENGTH, maxLength: DESCRIPTION_MAX_LENGTH },
  category: { type: 'string', enum: [...TICKET_CATEGORIES] },
  priority: { type: 'string', enum: [...TICKET_PRIORITIES] },
  status: { type: 'string', enum: [...TICKET_STATUSES] },
  resolved_at: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  assigned_to: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  tags: {
    type: 'array',
    items: { type: 'string' },
  },
  metadata: metadataSchema,
};

const ticketSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' },
    ...ticketBodyProperties,
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    classification_confidence: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    classification_reasoning: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    classification_keywords: { type: 'array', items: { type: 'string' } },
    classification_overridden: { type: 'boolean' },
  },
};

export const createTicketSchema = {
  querystring: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      auto_classify: { anyOf: [{ type: 'boolean' }, { type: 'string' }] },
    },
  },
  body: {
    type: 'object' as const,
    required: ['customer_id', 'customer_email', 'customer_name', 'subject', 'description'],
    additionalProperties: false,
    properties: ticketBodyProperties,
  },
  response: {
    201: ticketSchema,
  },
};

export const importTicketSchema = {
  body: {
    type: 'object' as const,
    required: ['format'],
    additionalProperties: false,
    properties: {
      format: { type: 'string', enum: ['csv', 'json', 'xml'] },
      content: { type: 'string' },
      records: { type: 'array' },
      auto_classify: { type: 'boolean' },
    },
    anyOf: [{ required: ['content'] }, { required: ['records'] }],
  },
};

export const listTicketsSchema = {
  querystring: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      category: { type: 'string', enum: [...TICKET_CATEGORIES] },
      priority: { type: 'string', enum: [...TICKET_PRIORITIES] },
      status: { type: 'string', enum: [...TICKET_STATUSES] },
      customer_id: { type: 'string' },
      customer_email: { type: 'string' },
      assigned_to: { type: 'string' },
      source: { type: 'string', enum: [...TICKET_SOURCES] },
      tag: { type: 'string' },
    },
  },
};

export const ticketParamsSchema = {
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
};

export const updateTicketSchema = {
  params: ticketParamsSchema.params,
  body: {
    type: 'object' as const,
    additionalProperties: false,
    minProperties: 1,
    properties: ticketBodyProperties,
  },
};

export const autoClassifyTicketSchema = {
  params: ticketParamsSchema.params,
  querystring: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      force: { anyOf: [{ type: 'boolean' }, { type: 'string' }] },
    },
  },
};
