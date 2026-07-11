import { existsSync, unlinkSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { createApplicationDatabase } from '../config/database.js';
import { TicketClassifier } from '../modules/tickets/ticket.classifier.js';
import { TicketImporter } from '../modules/tickets/ticket.importer.js';
import { classificationDecisions, tickets, type CreateTicketInput } from '../modules/tickets/ticket.model.js';
import { TicketRepository } from '../modules/tickets/ticket.repository.js';
import { TicketService } from '../modules/tickets/ticket.service.js';

const shouldReset = process.argv.includes('--reset') || !process.argv.includes('--append');
const databaseUrl = process.env.DATABASE_URL ?? './data/support.db';

const demoTickets: CreateTicketInput[] = [
  {
    customer_id: 'demo-cust-001',
    customer_email: 'olena.petrenko@example.com',
    customer_name: 'Olena Petrenko',
    subject: 'Cannot access account after password reset',
    description: 'I cannot access my account after using the password reset link. The login page keeps rejecting the new password.',
    tags: ['login', 'password', 'urgent'],
    metadata: { source: 'web_form', browser: 'Chrome', device_type: 'desktop' },
  },
  {
    customer_id: 'demo-cust-002',
    customer_email: 'max.chen@example.com',
    customer_name: 'Max Chen',
    subject: 'Duplicate invoice charge',
    description: 'My invoice shows a duplicate payment charge for the same subscription period. Please refund the extra payment.',
    tags: ['billing', 'refund'],
    metadata: { source: 'email', browser: 'unknown', device_type: 'desktop' },
  },
  {
    customer_id: 'demo-cust-003',
    customer_email: 'sofia.garcia@example.com',
    customer_name: 'Sofia Garcia',
    subject: 'Mobile app crash on launch',
    description: 'The mobile app crash happens every time I open it after the latest update. I already tried reinstalling.',
    tags: ['mobile', 'crash'],
    metadata: { source: 'chat', browser: 'Safari', device_type: 'mobile' },
  },
  {
    customer_id: 'demo-cust-004',
    customer_email: 'sam.wilson@example.com',
    customer_name: 'Sam Wilson',
    subject: 'Feature request for saved filters',
    description: 'Please add saved filters to the ticket list so our support team can quickly switch between common queues.',
    tags: ['feature', 'filters'],
    metadata: { source: 'api', browser: 'Firefox', device_type: 'desktop' },
  },
  {
    customer_id: 'demo-cust-005',
    customer_email: 'iryna.koval@example.com',
    customer_name: 'Iryna Koval',
    subject: 'Production down for admin dashboard',
    description: 'The admin dashboard is production down and blocking our operations team. This is critical for today.',
    tags: ['production', 'admin', 'blocking'],
    metadata: { source: 'phone', browser: 'Edge', device_type: 'desktop' },
  },
  {
    customer_id: 'demo-cust-006',
    customer_email: 'liam.brown@example.com',
    customer_name: 'Liam Brown',
    subject: 'Cosmetic alignment issue',
    description: 'Minor cosmetic issue on the settings page: the save button is slightly misaligned on tablet devices.',
    tags: ['ui', 'cosmetic'],
    metadata: { source: 'web_form', browser: 'Chrome', device_type: 'tablet' },
  },
  {
    customer_id: 'demo-cust-007',
    customer_email: 'nora.smith@example.com',
    customer_name: 'Nora Smith',
    subject: '2FA code never arrives',
    description: 'The 2FA code never arrives, so I cannot sign in to the workspace. I checked spam and tried twice.',
    tags: ['2fa', 'login'],
    metadata: { source: 'email', browser: 'Safari', device_type: 'mobile' },
  },
  {
    customer_id: 'demo-cust-008',
    customer_email: 'diego.martinez@example.com',
    customer_name: 'Diego Martinez',
    subject: 'API timeout error',
    description: 'Our integration gets a timeout error when syncing customer records. It started after the last deployment.',
    tags: ['api', 'timeout'],
    metadata: { source: 'api', browser: 'unknown', device_type: 'desktop' },
  },
  {
    customer_id: 'demo-cust-009',
    customer_email: 'emma.taylor@example.com',
    customer_name: 'Emma Taylor',
    subject: 'Important billing export blocked',
    description: 'Exporting billing reports is blocking our finance workflow and we need this fixed asap before month end.',
    tags: ['billing', 'export', 'asap'],
    metadata: { source: 'chat', browser: 'Chrome', device_type: 'desktop' },
  },
  {
    customer_id: 'demo-cust-010',
    customer_email: 'andriy.bondar@example.com',
    customer_name: 'Andriy Bondar',
    subject: 'Question about workspace settings',
    description: 'I have a general question about how workspace settings are inherited between teams and projects.',
    tags: ['question', 'workspace'],
    metadata: { source: 'web_form', browser: 'Firefox', device_type: 'desktop' },
  },
];

function main() {
  if (shouldReset) {
    removeSqliteFiles(databaseUrl);
  }

  const db = createApplicationDatabase();
  const service = new TicketService(
    new TicketRepository(db),
    new TicketClassifier(),
    new TicketImporter(),
  );

  if (shouldReset) {
    db.delete(classificationDecisions).run();
    db.delete(tickets).run();
  } else {
    for (const ticket of demoTickets) {
      const existing = db
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.customer_email, ticket.customer_email))
        .get();

      if (existing) continue;
      service.createTicket(ticket, { autoClassify: true });
    }

    console.log(`Seed complete: appended missing demo tickets. Total tickets: ${service.listTickets({}).length}`);
    return;
  }

  for (const ticket of demoTickets) {
    service.createTicket(ticket, { autoClassify: true });
  }

  const seededTickets = service.listTickets({});
  const urgentTickets = service.listTickets({ priority: 'urgent' });
  const billingTickets = service.listTickets({ category: 'billing_question' });

  console.log(`Seed complete: created ${seededTickets.length} demo tickets.`);
  console.log(`Urgent tickets: ${urgentTickets.length}`);
  console.log(`Billing tickets: ${billingTickets.length}`);
  console.log(`Database: ${databaseUrl}`);
}

function removeSqliteFiles(databasePath: string): void {
  if (databasePath === ':memory:' || databasePath.startsWith('file:')) return;

  for (const path of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`, `${databasePath}-journal`]) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}

main();
