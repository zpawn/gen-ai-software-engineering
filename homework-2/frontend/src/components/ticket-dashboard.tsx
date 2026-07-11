'use client';

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  Filter,
  Inbox,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, memo, useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { createTicket, importTickets, listTickets } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CreateTicketPayload, ImportSummary, Ticket } from '@/types/ticket';

const categoryOptions = ['', 'account_access', 'technical_issue', 'billing_question', 'feature_request', 'bug_report', 'other'];
const priorityOptions = ['', 'urgent', 'high', 'medium', 'low'];
const statusOptions = ['', 'new', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
const sourceOptions = ['', 'web_form', 'email', 'api', 'chat', 'phone'];

const emptyTicket: CreateTicketPayload = {
  customer_id: 'demo-cust-new',
  customer_email: 'customer@example.com',
  customer_name: 'Customer Name',
  subject: '',
  description: '',
  tags: [],
  metadata: {
    source: 'web_form',
    browser: 'Chrome',
    device_type: 'desktop',
  },
};

type Filters = {
  category: string;
  priority: string;
  status: string;
  source: string;
};

type SelectOption = {
  label: string;
  value: string | null;
};

export function TicketDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<Filters>({ category: '', priority: '', status: '', source: '' });
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draft, setDraft] = useState<CreateTicketPayload>(emptyTicket);
  const [tagText, setTagText] = useState('onboarding, web');
  const [importFormat, setImportFormat] = useState('json');
  const [importContent, setImportContent] = useState(sampleJson);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const visibleTickets = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return tickets;

    return tickets.filter((ticket) => {
      const searchable = [
        ticket.subject,
        ticket.customer_name,
        ticket.customer_email,
        ticket.category,
        ticket.priority,
        ticket.status,
        ticket.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalized);
    });
  }, [deferredQuery, tickets]);

  const metrics = useMemo(() => buildMetrics(tickets), [tickets]);

  const loadTickets = useCallback(async (nextFilters: Filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listTickets(nextFilters);
      setTickets(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load tickets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets(filters);
  }, [filters, loadTickets]);

  function applyFilter(name: keyof Filters, value: string | null) {
    startTransition(() => {
      setFilters((current) => ({ ...current, [name]: value ?? '' }));
    });
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const created = await createTicket({
        ...draft,
        tags: tagText
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      setMessage(`Created ticket ${created.id.slice(0, 8)} with ${created.category} classification.`);
      setDraft({ ...emptyTicket, customer_id: `demo-cust-${Date.now()}` });
      setTagText('onboarding, web');
      setIsCreateOpen(false);
      await loadTickets(filters);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create ticket');
    }
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const summary = await importTickets(importFormat, importContent);
      setImportSummary(summary);
      setMessage(`Imported ${summary.successful} of ${summary.total_records} records.`);
      await loadTickets(filters);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to import tickets');
    }
  }

  return (
    <main className="min-h-screen text-foreground">
      <header className="border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CircleDot className="text-primary" />
                Customer Support Operations
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Ticket dashboard</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadTickets(filters)} title="Refresh tickets">
                <RefreshCw data-icon="inline-start" className={cn(isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <Plus data-icon="inline-start" />
                New ticket
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard icon={Inbox} label="Total tickets" value={String(tickets.length)} />
            <MetricCard icon={Clock3} label="Open queue" value={String(metrics.open)} />
            <MetricCard icon={AlertTriangle} label="Urgent or high" value={String(metrics.escalated)} />
            <MetricCard icon={Wand2} label="AI classified" value={`${metrics.classified}%`} />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="text-accent" />
                Filters
              </CardTitle>
              <CardAction>{isPending ? <RefreshCw className="animate-spin text-muted-foreground" /> : null}</CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SelectField label="Category" value={filters.category} options={toSelectOptions(categoryOptions)} onChange={(value) => applyFilter('category', value)} />
                <SelectField label="Priority" value={filters.priority} options={toSelectOptions(priorityOptions)} onChange={(value) => applyFilter('priority', value)} />
                <SelectField label="Status" value={filters.status} options={toSelectOptions(statusOptions)} onChange={(value) => applyFilter('status', value)} />
                <SelectField label="Source" value={filters.source} options={toSelectOptions(sourceOptions)} onChange={(value) => applyFilter('source', value)} />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="text-accent" />
                Bulk import
              </CardTitle>
              <CardDescription>JSON, CSV, or XML payloads</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitImport}>
                <FieldGroup>
                  <SelectField
                    label="Format"
                    value={importFormat}
                    options={toSelectOptions(['json', 'csv', 'xml'], false)}
                    onChange={(value) => setImportFormat(value ?? 'json')}
                  />
                  <Field>
                    <FieldLabel htmlFor="import-payload">Payload</FieldLabel>
                    <Textarea id="import-payload" value={importContent} rows={8} onChange={(event) => setImportContent(event.target.value)} />
                  </Field>
                  <Button type="submit">
                    <Upload data-icon="inline-start" />
                    Import
                  </Button>
                  {importSummary ? (
                    <Alert>
                      <CheckCircle2 />
                      <AlertTitle>Imported {importSummary.successful} / {importSummary.total_records}</AlertTitle>
                      {importSummary.failed > 0 ? <AlertDescription>Failed records: {importSummary.failed}</AlertDescription> : null}
                    </Alert>
                  ) : null}
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </aside>

        <section className="flex flex-col gap-4">
          <StatusBanner isLoading={isLoading} message={message} error={error} />

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tickets</CardTitle>
                <CardDescription>{visibleTickets.length} visible in the current view</CardDescription>
              </div>
              <CardAction className="w-full lg:w-80">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search subject, customer, tags"
                    className="pl-8"
                  />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TicketTableSkeleton />
              ) : visibleTickets.length === 0 ? (
                <EmptyState />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </section>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create ticket</DialogTitle>
            <DialogDescription>New tickets are auto-classified after creation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate}>
            <FieldGroup>
              <div className="grid gap-3 sm:grid-cols-2">
                <InputField label="Customer ID" value={draft.customer_id} onChange={(value) => setDraft({ ...draft, customer_id: value })} />
                <InputField label="Customer email" value={draft.customer_email} onChange={(value) => setDraft({ ...draft, customer_email: value })} />
              </div>
              <InputField label="Customer name" value={draft.customer_name} onChange={(value) => setDraft({ ...draft, customer_name: value })} />
              <InputField label="Subject" value={draft.subject} onChange={(value) => setDraft({ ...draft, subject: value })} />
              <Field>
                <FieldLabel htmlFor="ticket-description">Description</FieldLabel>
                <Textarea
                  id="ticket-description"
                  value={draft.description}
                  rows={5}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </Field>
              <InputField label="Tags" value={tagText} onChange={setTagText} description="Comma-separated labels" />
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField
                  label="Source"
                  value={draft.metadata.source}
                  options={toSelectOptions(sourceOptions.filter(Boolean), false)}
                  onChange={(value) => setDraft({ ...draft, metadata: { ...draft.metadata, source: value as CreateTicketPayload['metadata']['source'] } })}
                />
                <SelectField
                  label="Device"
                  value={draft.metadata.device_type}
                  options={toSelectOptions(['desktop', 'mobile', 'tablet'], false)}
                  onChange={(value) => setDraft({ ...draft, metadata: { ...draft.metadata, device_type: value as CreateTicketPayload['metadata']['device_type'] } })}
                />
                <InputField label="Browser" value={draft.metadata.browser} onChange={(value) => setDraft({ ...draft, metadata: { ...draft.metadata, browser: value } })} />
              </div>
            </FieldGroup>
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Plus data-icon="inline-start" />
                Create ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

const TicketRow = memo(function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <TableRow>
      <TableCell className="min-w-[300px]">
        <Link href={`/tickets/${ticket.id}`} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{ticket.subject}</span>
            {ticket.classification_confidence !== null ? <Badge variant="secondary">{Math.round(ticket.classification_confidence * 100)}%</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">{ticket.category}</Badge>
            <Badge variant="outline">{ticket.metadata.source}</Badge>
            {ticket.tags.slice(0, 2).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
          </div>
        </Link>
      </TableCell>
      <TableCell className="min-w-[180px]">
        <div className="flex flex-col">
          <span className="truncate font-medium">{ticket.customer_name}</span>
          <span className="truncate text-muted-foreground">{ticket.customer_email}</span>
        </div>
      </TableCell>
      <TableCell><Badge variant={priorityVariant(ticket.priority)}>{ticket.priority}</Badge></TableCell>
      <TableCell><Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge></TableCell>
      <TableCell>
        <Button variant="ghost" size="icon-sm" render={<Link href={`/tickets/${ticket.id}`} />}>
          <ArrowRight />
          <span className="sr-only">Open ticket</span>
        </Button>
      </TableCell>
    </TableRow>
  );
});

function StatusBanner({ isLoading, message, error }: { isLoading: boolean; message: string | null; error: string | null }) {
  if (isLoading) {
    return (
      <Alert>
        <RefreshCw className="animate-spin" />
        <AlertTitle>Loading tickets</AlertTitle>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Request failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (message) {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    );
  }

  return null;
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Inbox; label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="rounded-lg bg-secondary p-2 text-accent">
            <Icon />
          </span>
          <span className="text-2xl">{value}</span>
        </CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: SelectOption[]; onChange: (value: string | null) => void }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select items={options} value={value || null} onValueChange={(nextValue) => onChange(typeof nextValue === 'string' ? nextValue : null)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value ?? 'all'} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function InputField({ label, value, description, onChange }: { label: string; value: string; description?: string; onChange: (value: string) => void }) {
  const id = `field-${label.toLowerCase().replaceAll(' ', '-')}`;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

function TicketTableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <SlidersHorizontal className="text-muted-foreground" />
      <Separator className="max-w-20" />
      <div>
        <div className="font-semibold">No tickets match this view</div>
        <p className="mt-1 text-sm text-muted-foreground">Adjust filters or create a new ticket.</p>
      </div>
    </div>
  );
}

function buildMetrics(tickets: Ticket[]) {
  const open = tickets.filter((ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed').length;
  const escalated = tickets.filter((ticket) => ticket.priority === 'urgent' || ticket.priority === 'high').length;
  const classifiedCount = tickets.filter((ticket) => ticket.classification_confidence !== null).length;
  const classified = tickets.length === 0 ? 0 : Math.round((classifiedCount / tickets.length) * 100);

  return { open, escalated, classified };
}

function priorityVariant(priority: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (priority === 'urgent') return 'destructive';
  if (priority === 'high') return 'default';
  if (priority === 'low') return 'outline';
  return 'secondary';
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'resolved' || status === 'closed') return 'outline';
  if (status === 'waiting_customer') return 'secondary';
  if (status === 'in_progress') return 'default';
  return 'secondary';
}

function toSelectOptions(values: string[], includeAll = true): SelectOption[] {
  return values
    .filter((value) => includeAll || value)
    .map((value) => ({
      label: value || 'all',
      value: value || null,
    }));
}

const sampleJson = JSON.stringify(
  [
    {
      customer_id: 'front-demo-1',
      customer_email: 'frontend@example.com',
      customer_name: 'Frontend Demo',
      subject: 'Invoice refund needed',
      description: 'Please refund a duplicate invoice payment for the current subscription period.',
      metadata: {
        source: 'web_form',
        browser: 'Chrome',
        device_type: 'desktop',
      },
      tags: ['billing', 'refund'],
    },
  ],
  null,
  2,
);
