import { TicketDetailPage } from '../../../components/ticket-detail-page';

type TicketPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params;

  return <TicketDetailPage ticketId={id} />;
}
