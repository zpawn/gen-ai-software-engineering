import { ParseError } from '../../shared/errors.js';
import type { CreateTicketInput } from './ticket.model.js';

export type ImportFormat = 'csv' | 'json' | 'xml';

export interface ImportPayload {
  format: ImportFormat;
  content?: string;
  records?: unknown[];
}

export class TicketImporter {
  parse(payload: ImportPayload): CreateTicketInput[] {
    if (payload.format === 'json' && payload.records) {
      return payload.records.map((record) => this.normalizeObjectRecord(record));
    }

    if (!payload.content || payload.content.trim().length === 0) {
      throw new ParseError('Import content is required', [{ field: 'content', message: 'Provide file content as a string' }]);
    }

    if (payload.format === 'csv') return this.parseCsv(payload.content);
    if (payload.format === 'json') return this.parseJson(payload.content);
    if (payload.format === 'xml') return this.parseXml(payload.content);

    throw new ParseError('Unsupported import format', [{ field: 'format', message: 'Use csv, json, or xml' }]);
  }

  private parseCsv(content: string): CreateTicketInput[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new ParseError('CSV import requires a header row and at least one ticket row');
    }

    const headers = this.parseCsvLine(lines[0]).map((header) => header.trim());
    if (!headers.includes('customer_email') || !headers.includes('subject') || !headers.includes('description')) {
      throw new ParseError('CSV header is missing required columns', [
        { field: 'header', message: 'customer_email, subject, and description are required' },
      ]);
    }

    return lines.slice(1).map((line) => {
      const values = this.parseCsvLine(line);
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? '';
      });
      return this.normalizeFlatRecord(record);
    });
  }

  private parseJson(content: string): CreateTicketInput[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ParseError('Malformed JSON import file');
    }

    const records = Array.isArray(parsed)
      ? parsed
      : this.isObject(parsed) && Array.isArray(parsed.tickets)
        ? parsed.tickets
        : undefined;

    if (!records) {
      throw new ParseError('JSON import must be an array or an object with a tickets array');
    }

    return records.map((record) => this.normalizeObjectRecord(record));
  }

  private parseXml(content: string): CreateTicketInput[] {
    const ticketMatches = [...content.matchAll(/<ticket\b[^>]*>([\s\S]*?)<\/ticket>/gi)];
    if (ticketMatches.length === 0) {
      throw new ParseError('XML import must contain at least one <ticket> element');
    }

    return ticketMatches.map((match) => {
      const block = match[1];
      const metadataBlock = this.readXmlTag(block, 'metadata');
      const tagBlock = this.readXmlTag(block, 'tags');
      const tagElements = tagBlock ? [...tagBlock.matchAll(/<tag\b[^>]*>([\s\S]*?)<\/tag>/gi)].map((tag) => this.decodeXml(tag[1])) : [];
      const fallbackTags = tagElements.length === 0 && tagBlock ? this.splitList(this.decodeXml(tagBlock)) : tagElements;

      return this.normalizeObjectRecord({
        customer_id: this.readXmlTag(block, 'customer_id'),
        customer_email: this.readXmlTag(block, 'customer_email'),
        customer_name: this.readXmlTag(block, 'customer_name'),
        subject: this.readXmlTag(block, 'subject'),
        description: this.readXmlTag(block, 'description'),
        category: this.readXmlTag(block, 'category'),
        priority: this.readXmlTag(block, 'priority'),
        status: this.readXmlTag(block, 'status'),
        assigned_to: this.readXmlTag(block, 'assigned_to'),
        tags: fallbackTags,
        metadata: {
          source: metadataBlock ? this.readXmlTag(metadataBlock, 'source') : undefined,
          browser: metadataBlock ? this.readXmlTag(metadataBlock, 'browser') : undefined,
          device_type: metadataBlock ? this.readXmlTag(metadataBlock, 'device_type') : undefined,
        },
      });
    });
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (inQuotes) {
      throw new ParseError('Malformed CSV import file', [{ field: 'content', message: 'Unclosed quoted field' }]);
    }

    values.push(current.trim());
    return values;
  }

  private normalizeFlatRecord(record: Record<string, string>): CreateTicketInput {
    return this.normalizeObjectRecord({
      customer_id: record.customer_id,
      customer_email: record.customer_email,
      customer_name: record.customer_name,
      subject: record.subject,
      description: record.description,
      category: record.category,
      priority: record.priority,
      status: record.status,
      assigned_to: record.assigned_to,
      tags: this.splitList(record.tags),
      metadata: {
        source: record['metadata.source'] ?? record.metadata_source,
        browser: record['metadata.browser'] ?? record.metadata_browser,
        device_type: record['metadata.device_type'] ?? record.metadata_device_type,
      },
    });
  }

  private normalizeObjectRecord(record: unknown): CreateTicketInput {
    if (!this.isObject(record)) {
      throw new ParseError('Import records must be objects');
    }

    const metadata = this.isObject(record.metadata) ? record.metadata : {};
    const tags = Array.isArray(record.tags) ? record.tags.map(String) : this.splitList(String(record.tags ?? ''));

    return {
      customer_id: String(record.customer_id ?? ''),
      customer_email: String(record.customer_email ?? ''),
      customer_name: String(record.customer_name ?? ''),
      subject: String(record.subject ?? ''),
      description: String(record.description ?? ''),
      category: this.optionalString(record.category),
      priority: this.optionalString(record.priority),
      status: this.optionalString(record.status),
      resolved_at: record.resolved_at === null ? null : this.optionalString(record.resolved_at),
      assigned_to: record.assigned_to === null ? null : this.optionalString(record.assigned_to),
      tags,
      metadata: {
        source: this.optionalString(metadata.source),
        browser: this.optionalString(metadata.browser),
        device_type: this.optionalString(metadata.device_type),
      },
    } as CreateTicketInput;
  }

  private readXmlTag(block: string, tagName: string): string | undefined {
    const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return match ? this.decodeXml(match[1].trim()) : undefined;
  }

  private decodeXml(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();
  }

  private splitList(value?: string): string[] {
    if (!value) return [];
    return value
      .split(/[|;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
