import { randomUUID } from 'node:crypto';
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
import { AppError, NotFoundError, ValidationError, type ValidationDetail } from '../../shared/errors.js';
import { TicketClassifier } from './ticket.classifier.js';
import { TicketImporter, type ImportPayload } from './ticket.importer.js';
import type {
  ClassificationDecision,
  CreateTicketInput,
  Ticket,
  TicketCategory,
  TicketFilters,
  TicketMetadata,
  TicketPriority,
  TicketStatus,
  UpdateTicketInput,
} from './ticket.model.js';
import { TicketRepository } from './ticket.repository.js';

export interface ImportSummary {
  total_records: number;
  successful: number;
  failed: number;
  errors: Array<{ record: number; error: string; details?: ValidationDetail[] }>;
  tickets: Ticket[];
}

export class TicketService {
  constructor(
    private readonly repository: TicketRepository,
    private readonly classifier: TicketClassifier,
    private readonly importer: TicketImporter,
  ) {}

  createTicket(input: CreateTicketInput, options: { autoClassify?: boolean } = {}): Ticket {
    this.validateTicketInput(input, false);
    const now = new Date().toISOString();
    const hasManualClassification = Boolean(input.category || input.priority);

    const ticket: Ticket = {
      id: randomUUID(),
      customer_id: input.customer_id.trim(),
      customer_email: input.customer_email.trim().toLowerCase(),
      customer_name: input.customer_name.trim(),
      subject: input.subject.trim(),
      description: input.description.trim(),
      category: input.category ?? 'other',
      priority: input.priority ?? 'medium',
      status: input.status ?? 'new',
      created_at: now,
      updated_at: now,
      resolved_at: this.resolveTimestamp(input.status ?? 'new', input.resolved_at),
      assigned_to: this.nullableString(input.assigned_to),
      tags: this.normalizeTags(input.tags),
      metadata: this.normalizeMetadata(input.metadata),
      classification_confidence: null,
      classification_reasoning: null,
      classification_keywords: [],
      classification_overridden: hasManualClassification,
    };

    const created = this.repository.create(ticket);
    if (options.autoClassify && !created.classification_overridden) {
      return this.autoClassifyTicket(created.id, { force: true }).ticket;
    }

    return created;
  }

  importTickets(payload: ImportPayload & { auto_classify?: boolean }): ImportSummary {
    const records = this.importer.parse(payload);
    const tickets: Ticket[] = [];
    const errors: ImportSummary['errors'] = [];

    records.forEach((record, index) => {
      try {
        tickets.push(this.createTicket(record, { autoClassify: payload.auto_classify }));
      } catch (error) {
        if (error instanceof AppError) {
          errors.push({ record: index + 1, error: error.message, details: error.details });
          return;
        }
        errors.push({ record: index + 1, error: 'Unexpected import error' });
      }
    });

    return {
      total_records: records.length,
      successful: tickets.length,
      failed: errors.length,
      errors,
      tickets,
    };
  }

  listTickets(filters: TicketFilters): Ticket[] {
    return this.repository.findAll(filters);
  }

  getTicketById(id: string): Ticket {
    const ticket = this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id '${id}' not found`);
    }
    return ticket;
  }

  updateTicket(id: string, input: UpdateTicketInput): Ticket {
    const existing = this.getTicketById(id);
    this.validateTicketInput(input, true);

    const status = input.status ?? existing.status;
    const manualOverride =
      input.category !== undefined && input.category !== existing.category
        ? true
        : input.priority !== undefined && input.priority !== existing.priority
          ? true
          : existing.classification_overridden;

    const updated: Ticket = {
      ...existing,
      ...input,
      customer_id: input.customer_id?.trim() ?? existing.customer_id,
      customer_email: input.customer_email?.trim().toLowerCase() ?? existing.customer_email,
      customer_name: input.customer_name?.trim() ?? existing.customer_name,
      subject: input.subject?.trim() ?? existing.subject,
      description: input.description?.trim() ?? existing.description,
      category: input.category ?? existing.category,
      priority: input.priority ?? existing.priority,
      status,
      resolved_at: this.resolveTimestamp(status, input.resolved_at ?? existing.resolved_at),
      assigned_to: input.assigned_to !== undefined ? this.nullableString(input.assigned_to) : existing.assigned_to,
      tags: input.tags !== undefined ? this.normalizeTags(input.tags) : existing.tags,
      metadata: input.metadata !== undefined ? this.normalizeMetadata(input.metadata, existing.metadata) : existing.metadata,
      classification_overridden: manualOverride,
      updated_at: new Date().toISOString(),
    };

    return this.repository.update(id, updated);
  }

  deleteTicket(id: string): void {
    if (!this.repository.delete(id)) {
      throw new NotFoundError(`Ticket with id '${id}' not found`);
    }
  }

  autoClassifyTicket(id: string, options: { force?: boolean } = {}): { ticket: Ticket; classification: ClassificationDecision } {
    const ticket = this.getTicketById(id);
    if (ticket.classification_overridden && !options.force) {
      throw new ValidationError([
        {
          field: 'classification_overridden',
          message: 'Ticket has a manual category or priority override. Pass force=true to replace it.',
        },
      ]);
    }

    const decision = this.classifier.classify(ticket);
    const updated: Ticket = {
      ...ticket,
      category: decision.category,
      priority: decision.priority,
      updated_at: new Date().toISOString(),
      classification_confidence: decision.confidence,
      classification_reasoning: decision.reasoning,
      classification_keywords: decision.keywords_found,
      classification_overridden: false,
    };

    this.repository.appendClassificationDecision(id, decision);
    return { ticket: this.repository.update(id, updated), classification: decision };
  }

  getClassificationLog(id: string): ClassificationDecision[] {
    this.getTicketById(id);
    return this.repository.getClassificationLog(id);
  }

  private validateTicketInput(input: UpdateTicketInput, partial: boolean): void {
    const errors: ValidationDetail[] = [];

    this.requireString(input.customer_id, 'customer_id', errors, partial);
    this.requireString(input.customer_email, 'customer_email', errors, partial);
    this.requireString(input.customer_name, 'customer_name', errors, partial);
    this.requireString(input.subject, 'subject', errors, partial);
    this.requireString(input.description, 'description', errors, partial);

    if (input.customer_email !== undefined && !new RegExp(EMAIL_PATTERN).test(input.customer_email)) {
      errors.push({ field: 'customer_email', message: 'Must be a valid email address' });
    }

    if (input.subject !== undefined) {
      this.validateLength(input.subject, 'subject', SUBJECT_MIN_LENGTH, SUBJECT_MAX_LENGTH, errors);
    }

    if (input.description !== undefined) {
      this.validateLength(input.description, 'description', DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH, errors);
    }

    this.validateEnum(input.category, 'category', TICKET_CATEGORIES, errors);
    this.validateEnum(input.priority, 'priority', TICKET_PRIORITIES, errors);
    this.validateEnum(input.status, 'status', TICKET_STATUSES, errors);
    this.validateEnum(input.metadata?.source, 'metadata.source', TICKET_SOURCES, errors);
    this.validateEnum(input.metadata?.device_type, 'metadata.device_type', DEVICE_TYPES, errors);

    if (input.tags !== undefined && !Array.isArray(input.tags)) {
      errors.push({ field: 'tags', message: 'Must be an array of strings' });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }

  private requireString(value: unknown, field: string, errors: ValidationDetail[], partial: boolean): void {
    if (value === undefined && partial) return;
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push({ field, message: 'Required string field is missing or empty' });
    }
  }

  private validateLength(value: string, field: string, min: number, max: number, errors: ValidationDetail[]): void {
    const length = value.trim().length;
    if (length < min || length > max) {
      errors.push({ field, message: `Must be between ${min} and ${max} characters` });
    }
  }

  private validateEnum<T extends readonly string[]>(
    value: unknown,
    field: string,
    values: T,
    errors: ValidationDetail[],
  ): void {
    if (value !== undefined && !values.includes(value as T[number])) {
      errors.push({ field, message: `Must be one of: ${values.join(', ')}` });
    }
  }

  private normalizeMetadata(input: Partial<TicketMetadata> = {}, existing?: TicketMetadata): TicketMetadata {
    return {
      source: input.source ?? existing?.source ?? 'api',
      browser: input.browser?.trim() ?? existing?.browser ?? 'unknown',
      device_type: input.device_type ?? existing?.device_type ?? 'desktop',
    };
  }

  private normalizeTags(tags: string[] = []): string[] {
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  }

  private nullableString(value?: string | null): string | null {
    if (value === undefined || value === null || value.trim() === '') return null;
    return value.trim();
  }

  private resolveTimestamp(status: TicketStatus, provided?: string | null): string | null {
    if (provided !== undefined) return provided;
    return status === 'resolved' || status === 'closed' ? new Date().toISOString() : null;
  }
}
