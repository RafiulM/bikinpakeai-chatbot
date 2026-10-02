import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { labApi } from "@/lib/lab/api-client";
import type { SupportTicket, TicketStatus } from "@/lib/lab/types";
import { useLabConversation } from "./conversation-store";

// Tickets for the Agent view, loaded from the API and shared with the
// navigation so the open count is visible from every view. The queue is
// refreshed periodically and whenever the window regains focus.

const REFRESH_MS = 15_000;

interface TicketValue {
  tickets: SupportTicket[];
  counts: Record<TicketStatus, number>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  claim: (id: string) => Promise<void>;
  close: (id: string) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  reply: (id: string, content: string, close: boolean) => Promise<void>;
}

const TicketContext = createContext<TicketValue | null>(null);

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await labApi.listTickets();
      setTickets(data);
      setError(null);
    } catch {
      setError("Antrean tiket gagal dimuat. Coba lagi sebentar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // First load right after mount, then on a timer and on window focus.
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // A new escalation in the active conversation means a new ticket.
  const { conversation } = useLabConversation();
  const ticketCodes = conversation.turns
    .map((turn) => turn.ticketId)
    .filter(Boolean)
    .join(",");
  useEffect(() => {
    if (!ticketCodes) return;
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [ticketCodes, refresh]);

  const replaceTicket = useCallback(
    (updated: SupportTicket) =>
      setTickets((current) =>
        current.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
      ),
    [],
  );

  const setStatus = useCallback(
    async (id: string, status: TicketStatus) =>
      replaceTicket(await labApi.setTicketStatus(id, status)),
    [replaceTicket],
  );

  const value = useMemo<TicketValue>(() => {
    const counts: Record<TicketStatus, number> = {
      open: 0,
      claimed: 0,
      closed: 0,
    };
    for (const ticket of tickets) counts[ticket.status] += 1;
    return {
      tickets,
      counts,
      loading,
      error,
      refresh,
      claim: (id) => setStatus(id, "claimed"),
      close: (id) => setStatus(id, "closed"),
      reopen: (id) => setStatus(id, "open"),
      reply: async (id, content, close) =>
        replaceTicket(await labApi.replyTicket(id, content, close)),
    };
  }, [tickets, loading, error, refresh, setStatus, replaceTicket]);

  return (
    <TicketContext.Provider value={value}>{children}</TicketContext.Provider>
  );
}

export function useTickets() {
  const value = useContext(TicketContext);
  if (!value) throw new Error("useTickets must be used inside TicketProvider.");
  return value;
}
