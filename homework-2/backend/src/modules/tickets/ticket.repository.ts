import { and, asc, eq, like } from 'drizzle-orm';
import { createDatabase, type AppDatabase } from '../../config/database.js';
import {
  classificationDecisions,
  tickets,
  type ClassificationDecision,
  type ClassificationDecisionRow,
  type DeviceType,
  type Ticket,
  type TicketCategory,
  type TicketFilters,
  type TicketMetadata,
  type TicketPriority,
  type TicketRow,
  type TicketSource,
  type TicketStatus,
} from './ticket.model.js';

export class TicketRepository {
  constructor(private readonly db: AppDatabase = createDatabase()) {}

  create(ticket: Ticket): Ticket {
    this.db.insert(tickets).values(this.toRow(ticket)).run();
    return this.findById(ticket.id)!;
  }

  findById(id: string): Ticket | undefined {
    const row = this.db.select().from(tickets).where(eq(tickets.id, id)).get();
    return row ? this.fromRow(row) : undefined;
  }

  findAll(filters: TicketFilters = {}): Ticket[] {
    const conditions = [
      filters.category ? eq(tickets.category, filters.category) : undefined,
      filters.priority ? eq(tickets.priority, filters.priority) : undefined,
      filters.status ? eq(tickets.status, filters.status) : undefined,
      filters.customer_id ? eq(tickets.customer_id, filters.customer_id) : undefined,
      filters.customer_email ? eq(tickets.customer_email, filters.customer_email) : undefined,
      filters.assigned_to ? eq(tickets.assigned_to, filters.assigned_to) : undefined,
      filters.tag ? like(tickets.tags, `%"${filters.tag}"%`) : undefined,
    ].filter((condition) => condition !== undefined);

    if (filters.source) {
      conditions.push(like(tickets.metadata, `%"source":"${filters.source}"%`));
    }

    const query = this.db.select().from(tickets);
    const rows = conditions.length > 0
      ? query.where(and(...conditions)).orderBy(asc(tickets.created_at)).all()
      : query.orderBy(asc(tickets.created_at)).all();
    return rows.map((row) => this.fromRow(row));
  }

  update(id: string, changes: Ticket): Ticket {
    this.db.update(tickets).set(this.toRow(changes)).where(eq(tickets.id, id)).run();
    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.delete(tickets).where(eq(tickets.id, id)).run();
    return result.changes > 0;
  }

  appendClassificationDecision(ticketId: string, decision: ClassificationDecision): void {
    this.db
      .insert(classificationDecisions)
      .values({
        ticket_id: ticketId,
        category: decision.category,
        priority: decision.priority,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        keywords_found: JSON.stringify(decision.keywords_found),
        decided_at: decision.decided_at,
      })
      .run();
  }

  getClassificationLog(ticketId: string): ClassificationDecision[] {
    return this.db
      .select()
      .from(classificationDecisions)
      .where(eq(classificationDecisions.ticket_id, ticketId))
      .orderBy(asc(classificationDecisions.decided_at))
      .all()
      .map((row) => this.decisionFromRow(row));
  }

  private toRow(ticket: Ticket): typeof tickets.$inferInsert {
    return {
      ...ticket,
      tags: JSON.stringify(ticket.tags),
      metadata: JSON.stringify(ticket.metadata),
      classification_keywords: JSON.stringify(ticket.classification_keywords),
    };
  }

  private fromRow(row: TicketRow): Ticket {
    return {
      ...row,
      category: row.category as TicketCategory,
      priority: row.priority as TicketPriority,
      status: row.status as TicketStatus,
      tags: this.parseJsonArray(row.tags),
      metadata: this.parseMetadata(row.metadata),
      classification_keywords: this.parseJsonArray(row.classification_keywords),
    };
  }

  private decisionFromRow(row: ClassificationDecisionRow): ClassificationDecision {
    return {
      category: row.category as TicketCategory,
      priority: row.priority as TicketPriority,
      confidence: row.confidence,
      reasoning: row.reasoning,
      keywords_found: this.parseJsonArray(row.keywords_found),
      decided_at: row.decided_at,
    };
  }

  private parseJsonArray(value: string): string[] {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }

  private parseMetadata(value: string): TicketMetadata {
    const parsed: unknown = JSON.parse(value);
    const metadata = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};

    return {
      source: metadata.source as TicketSource,
      browser: String(metadata.browser ?? 'unknown'),
      device_type: metadata.device_type as DeviceType,
    };
  }
}
