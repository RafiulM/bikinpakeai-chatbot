import type { SupportTicket, TicketPriority } from "./types";

// Pure queue rules for the Agent view, shared by the UI and the API.

const PRIORITY_RANK: Record<TicketPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type FrustrationLevel = "tinggi" | "sedang" | "rendah";

export function frustrationLevel(score: number): FrustrationLevel {
  if (score >= 0.75) return "tinggi";
  if (score >= 0.4) return "sedang";
  return "rendah";
}

export type TicketSort = "urgency" | "frustration" | "waiting";

type Sortable = Pick<
  SupportTicket,
  "priority" | "frustrationScore" | "createdAt"
>;

const byPriority = (a: Sortable, b: Sortable) =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
const byFrustration = (a: Sortable, b: Sortable) =>
  b.frustrationScore - a.frustrationScore;
const byAge = (a: Sortable, b: Sortable) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

/**
 * Queue order. "urgency" (default): most urgent first, then the most
 * frustrated customer, then the oldest ticket so nobody waits forever.
 */
export function sortTickets<T extends Sortable>(
  tickets: T[],
  mode: TicketSort = "urgency",
) {
  const compare =
    mode === "frustration"
      ? (a: T, b: T) => byFrustration(a, b) || byPriority(a, b) || byAge(a, b)
      : mode === "waiting"
        ? (a: T, b: T) => byAge(a, b) || byPriority(a, b)
        : (a: T, b: T) =>
            byPriority(a, b) || byFrustration(a, b) || byAge(a, b);
  return [...tickets].sort(compare);
}

export type TicketFilter = "active" | "done" | "all";

/** Status group plus free-text search over code, product, issue and summary. */
export function filterTickets<
  T extends Pick<
    SupportTicket,
    | "status"
    | "code"
    | "product"
    | "issueLabel"
    | "summary"
    | "conversationCode"
  >,
>(tickets: T[], filter: TicketFilter, query: string) {
  const needle = query.trim().toLowerCase();
  return tickets.filter((ticket) => {
    const inGroup =
      filter === "all" ||
      (filter === "done"
        ? ticket.status === "closed"
        : ticket.status !== "closed");
    if (!inGroup) return false;
    if (!needle) return true;
    return [
      ticket.code,
      ticket.product,
      ticket.issueLabel,
      ticket.summary,
      ticket.conversationCode,
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}
