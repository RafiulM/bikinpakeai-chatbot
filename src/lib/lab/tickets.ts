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

const ISSUE_TEXT: Record<string, string> = {
  pembayaran: "Pembayaran",
  akses_akun: "Akses akun",
  cara_pakai: "Cara pakai",
  bug: "Bug",
  saran_fitur: "Saran fitur",
};

const NEXT_STEP: Record<string, string> = {
  pembayaran:
    "Cek status invoice dan aktivasi, tawarkan aktivasi manual bila perlu, lalu putuskan refund sesuai kebijakan.",
  akses_akun:
    "Verifikasi email akun pelanggan, lalu pulihkan akses atau kirim tautan masuk baru.",
  cara_pakai:
    "Pandu pelanggan langkah demi langkah dan tautkan dokumentasi yang relevan.",
  bug: "Minta tangkapan layar galat, coba ulang di akun uji, dan tawarkan solusi sementara.",
  saran_fitur:
    "Catat saran untuk tim produk dan beri tahu pelanggan cara memantau rilis baru.",
};

export interface EscalationInput {
  messageText: string;
  product: string;
  issueType: string;
  urgency: string;
  frustrationScore: number;
  churnRisk: number;
  refundRequested?: boolean;
  rules: string[];
}

/** Priority: urgent for deadlines or very upset customers, then high, medium, low. */
export function ticketPriority(input: EscalationInput): TicketPriority {
  if (input.urgency === "mendesak" || input.frustrationScore >= 0.85)
    return "urgent";
  if (
    input.frustrationScore >= 0.75 ||
    input.churnRisk >= 0.7 ||
    input.refundRequested
  )
    return "high";
  if (input.frustrationScore >= 0.4) return "medium";
  return "low";
}

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/** Everything a new ticket needs, written for the agent who picks it up. */
export function ticketDraft(input: EscalationInput) {
  const issueLabel = ISSUE_TEXT[input.issueType] ?? "Lainnya";
  const decimal = (value: number) =>
    value.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return {
    title: clip(`${issueLabel} ${input.product}: ${input.messageText}`, 120),
    priority: ticketPriority(input),
    product: input.product,
    issueLabel: input.refundRequested ? `${issueLabel} · refund` : issueLabel,
    summary: clip(input.messageText, 140),
    summaryPoints: [
      `Pelanggan menulis: “${clip(input.messageText, 160)}”`,
      `Frustrasi ${decimal(input.frustrationScore)}, risiko churn ${decimal(input.churnRisk)}, urgensi ${input.urgency}.`,
      ...(input.refundRequested ? ["Pelanggan meminta refund."] : []),
    ],
    nextStep: NEXT_STEP[input.issueType] ?? NEXT_STEP.cara_pakai,
    escalationReason: input.rules.length
      ? input.rules.join("; ")
      : "Butuh keputusan manusia",
  };
}

/**
 * Allowed status changes: claim an open ticket, close an active one, reopen
 * a closed one (back to claimed when someone had claimed it). Returns null
 * for a change that is not allowed.
 */
export function nextTicketStatus(
  current: SupportTicket["status"],
  requested: SupportTicket["status"],
  claimedBy: string | null,
): SupportTicket["status"] | null {
  if (current === requested) return null;
  if (requested === "closed") return current === "closed" ? null : "closed";
  if (current === "closed") return claimedBy ? "claimed" : "open";
  if (current === "open" && requested === "claimed") return "claimed";
  if (current === "claimed" && requested === "open") return "open";
  return null;
}
