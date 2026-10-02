import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockTickets } from "@/lib/lab/mock-tickets";
import type { SupportTicket, TicketStatus } from "@/lib/lab/types";

// Tickets for the Agent view, shared with the navigation so the open count is
// visible from every view.

interface TicketValue {
  tickets: SupportTicket[];
  counts: Record<TicketStatus, number>;
  updateTicket: (
    id: string,
    update: (ticket: SupportTicket) => SupportTicket,
  ) => void;
}

const TicketContext = createContext<TicketValue | null>(null);

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);

  const updateTicket = useCallback(
    (id: string, update: (ticket: SupportTicket) => SupportTicket) =>
      setTickets((current) =>
        current.map((ticket) => (ticket.id === id ? update(ticket) : ticket)),
      ),
    [],
  );

  const value = useMemo<TicketValue>(() => {
    const counts: Record<TicketStatus, number> = {
      open: 0,
      claimed: 0,
      closed: 0,
    };
    for (const ticket of tickets) counts[ticket.status] += 1;
    return { tickets, counts, updateTicket };
  }, [tickets, updateTicket]);

  return (
    <TicketContext.Provider value={value}>{children}</TicketContext.Provider>
  );
}

export function useTickets() {
  const value = useContext(TicketContext);
  if (!value) throw new Error("useTickets must be used inside TicketProvider.");
  return value;
}
