import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockTickets } from "@/lib/lab/mock-tickets";
import type { SupportTicket, TicketReply, TicketStatus } from "@/lib/lab/types";
import { useLabConversation } from "./conversation-store";

// Tickets for the Agent view, shared with the navigation so the open count is
// visible from every view.

/** Name shown on replies written in this session. */
export const AGENT_NAME = "Kamu";

interface TicketValue {
  tickets: SupportTicket[];
  counts: Record<TicketStatus, number>;
  claim: (id: string, agentName: string) => void;
  close: (id: string) => void;
  reopen: (id: string) => void;
  reply: (id: string, content: string, agentName: string) => TicketReply;
}

const TicketContext = createContext<TicketValue | null>(null);

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  // Status before closing, so "Buka lagi" restores exactly what it was.
  const [previousStatus, setPreviousStatus] = useState<
    Record<string, TicketStatus>
  >({});
  const { addAgentReply } = useLabConversation();

  const updateTicket = useCallback(
    (id: string, update: (ticket: SupportTicket) => SupportTicket) =>
      setTickets((current) =>
        current.map((ticket) => (ticket.id === id ? update(ticket) : ticket)),
      ),
    [],
  );

  const claim = useCallback(
    (id: string, agentName: string) =>
      updateTicket(id, (ticket) => ({
        ...ticket,
        status: "claimed",
        claimedBy: agentName,
      })),
    [updateTicket],
  );

  const close = useCallback(
    (id: string) => {
      const current = tickets.find((ticket) => ticket.id === id);
      if (current && current.status !== "closed")
        setPreviousStatus((map) => ({ ...map, [id]: current.status }));
      updateTicket(id, (ticket) => ({ ...ticket, status: "closed" }));
    },
    [tickets, updateTicket],
  );

  const reopen = useCallback(
    (id: string) =>
      updateTicket(id, (ticket) => ({
        ...ticket,
        status: previousStatus[id] ?? (ticket.claimedBy ? "claimed" : "open"),
      })),
    [previousStatus, updateTicket],
  );

  const reply = useCallback(
    (id: string, content: string, agentName: string) => {
      const ticket = tickets.find((item) => item.id === id);
      const created: TicketReply = {
        id: `local-reply-${Date.now()}`,
        ticketId: id,
        agentName,
        content,
        createdAt: new Date().toISOString(),
      };
      updateTicket(id, (current) => ({
        ...current,
        replies: [...current.replies, created],
      }));
      // The customer sees the human reply in their own chat.
      if (ticket)
        addAgentReply(ticket.conversationId, ticket.messageId, {
          ...created,
          ticketId: ticket.code,
        });
      return created;
    },
    [tickets, updateTicket, addAgentReply],
  );

  const value = useMemo<TicketValue>(() => {
    const counts: Record<TicketStatus, number> = {
      open: 0,
      claimed: 0,
      closed: 0,
    };
    for (const ticket of tickets) counts[ticket.status] += 1;
    return { tickets, counts, claim, close, reopen, reply };
  }, [tickets, claim, close, reopen, reply]);

  return (
    <TicketContext.Provider value={value}>{children}</TicketContext.Provider>
  );
}

export function useTickets() {
  const value = useContext(TicketContext);
  if (!value) throw new Error("useTickets must be used inside TicketProvider.");
  return value;
}
