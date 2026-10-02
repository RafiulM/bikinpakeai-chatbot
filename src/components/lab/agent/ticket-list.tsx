import type { SupportTicket } from "@/lib/lab/types";
import { TicketCard } from "./ticket-card";

/** The queue: one card per escalated ticket. */
export function TicketList({
  tickets,
  selectedId,
  onSelect,
  now,
}: {
  tickets: SupportTicket[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  /** Reference time for "x minutes ago", fixed per render for SSR safety. */
  now: number;
}) {
  return (
    <ul className="grid gap-2">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <TicketCard
            ticket={ticket}
            selected={ticket.id === selectedId}
            now={now}
            onSelect={() => onSelect(ticket.id)}
          />
        </li>
      ))}
    </ul>
  );
}
