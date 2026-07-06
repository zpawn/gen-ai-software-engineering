import type { ClassificationResponse, CreateTicketPayload, ImportSummary, Ticket } from '../types/ticket';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

interface ListFilters {
  category?: string;
  priority?: string;
  status?: string;
  source?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error ?? 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listTickets(filters: ListFilters): Promise<Ticket[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return request<Ticket[]>(`/tickets${query ? `?${query}` : ''}`);
}

export function getTicket(id: string): Promise<Ticket> {
  return request<Ticket>(`/tickets/${id}`);
}

export function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  return request<Ticket>('/tickets?auto_classify=true', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function importTickets(format: string, content: string): Promise<ImportSummary> {
  return request<ImportSummary>('/tickets/import', {
    method: 'POST',
    body: JSON.stringify({ format, content, auto_classify: true }),
  });
}

export function autoClassifyTicket(id: string): Promise<ClassificationResponse> {
  return request<ClassificationResponse>(`/tickets/${id}/auto-classify?force=true`, {
    method: 'POST',
  });
}

export function updateTicketStatus(id: string, status: string): Promise<Ticket> {
  return request<Ticket>(`/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function deleteTicket(id: string): Promise<void> {
  return request<void>(`/tickets/${id}`, {
    method: 'DELETE',
  });
}
