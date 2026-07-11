'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Laptop,
  Mail,
  RefreshCw,
  Trash2,
  UserRound,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { autoClassifyTicket, deleteTicket, getTicket, updateTicketStatus } from '@/lib/api';
import type { Ticket } from '@/types/ticket';

const statuses = ['new', 'in_progress', 'waiting_customer', 'resolved', 'closed'];

export function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confidence =
    ticket && ticket.classification_confidence !== null
      ? `${Math.round(ticket.classification_confidence * 100)}%`
      : 'Not classified';

  const loadTicket = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTicket(await getTicket(ticketId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load ticket');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  async function classify() {
    if (!ticket) return;
    setMessage(null);
    setError(null);
    try {
      const result = await autoClassifyTicket(ticket.id);
      setTicket(result.ticket);
      setMessage(`Classified as ${result.classification.category} / ${result.classification.priority}.`);
    } catch (classifyError) {
      setError(classifyError instanceof Error ? classifyError.message : 'Unable to classify ticket');
    }
  }

  async function changeStatus(status: string | null) {
    if (!ticket || !status) return;
    setMessage(null);
    setError(null);
    try {
      const updated = await updateTicketStatus(ticket.id, status);
      setTicket(updated);
      setMessage(`Updated status to ${updated.status}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update status');
    }
  }

  async function removeTicket() {
    if (!ticket) return;
    setMessage(null);
    setError(null);
    try {
      await deleteTicket(ticket.id);
      router.push('/');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete ticket');
    }
  }

  return (
    <main className="min-h-screen text-foreground">
      <header className="border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Button variant="ghost" render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" />
            Dashboard
          </Button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-muted-foreground">Ticket detail</div>
              <h1 className="mt-2 break-words text-3xl font-semibold tracking-normal">
                {ticket?.subject ?? 'Loading ticket'}
              </h1>
              {ticket ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {ticket.id} · Created {formatDate(ticket.created_at)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadTicket()}>
                <RefreshCw data-icon="inline-start" className={isLoading ? 'animate-spin' : undefined} />
                Refresh
              </Button>
              <Button type="button" onClick={() => void classify()} disabled={!ticket}>
                <Wand2 data-icon="inline-start" />
                Classify
              </Button>
              <Button type="button" variant="destructive" onClick={() => void removeTicket()} disabled={!ticket}>
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="flex flex-col gap-4">
          <StatusBanner isLoading={isLoading} message={message} error={error} />

          {isLoading && !ticket ? <DetailSkeleton /> : null}

          {ticket ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="text-accent" />
                    Customer request
                  </CardTitle>
                  <CardDescription>{ticket.customer_email}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <p className="whitespace-pre-wrap text-sm leading-6">{ticket.description}</p>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.length > 0 ? ticket.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>) : <Badge variant="outline">no tags</Badge>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="text-accent" />
                    Classification
                  </CardTitle>
                  <CardDescription>Rule-based category and priority result</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoTile label="Category" value={ticket.category} />
                    <InfoTile label="Priority" value={ticket.priority} />
                    <InfoTile label="Confidence" value={confidence} />
                  </div>
                  {ticket.classification_reasoning ? (
                    <Alert>
                      <Wand2 />
                      <AlertTitle>Reasoning</AlertTitle>
                      <AlertDescription>{ticket.classification_reasoning}</AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {ticket.classification_keywords.length > 0
                      ? ticket.classification_keywords.map((keyword) => <Badge key={keyword}>{keyword}</Badge>)
                      : <Badge variant="outline">no keywords</Badge>}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {ticket ? (
          <aside className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="text-accent" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <InfoLine label="Name" value={ticket.customer_name} />
                <InfoLine label="Email" value={ticket.customer_email} />
                <InfoLine label="Customer ID" value={ticket.customer_id} />
                <InfoLine label="Assigned to" value={ticket.assigned_to ?? 'Unassigned'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="text-accent" />
                  Workflow
                </CardTitle>
                <CardAction><Badge variant="secondary">{ticket.status}</Badge></CardAction>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Select items={toSelectOptions(statuses)} value={ticket.status} onValueChange={(value) => void changeStatus(typeof value === 'string' ? value : null)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <InfoLine label="Created" value={formatDate(ticket.created_at)} />
                  <InfoLine label="Updated" value={formatDate(ticket.updated_at)} />
                  <InfoLine label="Resolved" value={ticket.resolved_at ? formatDate(ticket.resolved_at) : 'Not resolved'} />
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="text-accent" />
                  Source
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <InfoLine label="Channel" value={ticket.metadata.source} />
                <InfoLine label="Device" value={ticket.metadata.device_type} />
                <InfoLine label="Browser" value={ticket.metadata.browser} />
              </CardContent>
            </Card>
          </aside>
        ) : null}
      </section>
    </main>
  );
}

function StatusBanner({ isLoading, message, error }: { isLoading: boolean; message: string | null; error: string | null }) {
  if (isLoading) {
    return (
      <Alert>
        <RefreshCw className="animate-spin" />
        <AlertTitle>Loading ticket</AlertTitle>
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="break-words">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </CardContent>
    </Card>
  );
}

function toSelectOptions(values: string[]) {
  return values.map((value) => ({ label: value, value }));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
