import { TicketsKanbanBoard } from './TicketsKanbanBoard';

interface TicketsViewProps {
  onSelectTicket: (convId: string) => void;
}

export function TicketsView({ onSelectTicket }: TicketsViewProps) {
  return <TicketsKanbanBoard onSelectTicket={onSelectTicket} />;
}
