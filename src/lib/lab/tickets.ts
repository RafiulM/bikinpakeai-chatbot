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

/**
 * Most urgent first; within a priority, the most frustrated customer first;
 * then the oldest ticket, so nobody waits forever.
 */
export function sortTickets<
  T extends Pick<SupportTicket, "priority" | "frustrationScore" | "createdAt">,
>(tickets: T[]) {
  return [...tickets].sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.frustrationScore - a.frustrationScore ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
