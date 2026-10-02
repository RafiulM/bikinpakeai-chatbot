import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  conversations,
  messages,
  responses,
  ticketReplies,
  tickets,
} from "@/db/schema";
import { filterTickets, sortTickets, ticketDraft } from "@/lib/lab/tickets";
import type {
  JevAnalysis,
  SupportTicket,
  TicketExcerptLine,
  TicketStatus,
} from "@/lib/lab/types";
import type { ListTicketsInput } from "@/validators/tickets";

// Support tickets. Creation is internal (called by the answer pipeline after
// it verified ownership); agent actions are owner-scoped in their own service
// functions.

export const ticketCode = (number: number | null) => `T-${number ?? 0}`;

/**
 * Opens a ticket for an escalated message. Idempotent per message: a second
 * call returns the existing ticket's code.
 */
export async function createTicketForEscalation(
  messageId: string,
  analysis: JevAnalysis,
  refundRequested: boolean,
) {
  const [message] = await db
    .select({
      conversationId: messages.conversationId,
      content: messages.content,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!message) return null;
  const draft = ticketDraft({
    messageText: message.content,
    product: analysis.product,
    issueType: analysis.issueType,
    urgency: analysis.urgency,
    frustrationScore: analysis.frustrationScore,
    churnRisk: analysis.churnRisk,
    refundRequested,
    rules: analysis.rules,
  });
  const [created] = await db
    .insert(tickets)
    .values({
      conversationId: message.conversationId,
      messageId,
      ...draft,
      frustrationScore: analysis.frustrationScore,
      churnRisk: analysis.churnRisk,
    })
    .onConflictDoNothing({ target: tickets.messageId })
    .returning({ number: tickets.number });
  if (created) return ticketCode(created.number);
  const [existing] = await db
    .select({ number: tickets.number })
    .from(tickets)
    .where(eq(tickets.messageId, messageId))
    .limit(1);
  return existing ? ticketCode(existing.number) : null;
}

/** Ticket codes and agent replies for the given messages (conversation view). */
export async function ticketsForMessages(messageIds: string[]) {
  if (messageIds.length === 0) return [];
  const rows = await db
    .select({
      id: tickets.id,
      number: tickets.number,
      messageId: tickets.messageId,
    })
    .from(tickets)
    .where(inArray(tickets.messageId, messageIds));
  const replies = rows.length
    ? await db
        .select()
        .from(ticketReplies)
        .where(
          inArray(
            ticketReplies.ticketId,
            rows.map((row) => row.id),
          ),
        )
    : [];
  return rows.map((row) => ({
    messageId: row.messageId,
    code: ticketCode(row.number),
    replies: replies
      .filter((reply) => reply.ticketId === row.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((reply) => ({
        id: reply.id,
        ticketId: ticketCode(row.number),
        agentName: reply.agentName,
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
      })),
  }));
}

const ticketFields = {
  ticket: tickets,
  conversationNumber: conversations.number,
};

type TicketRow = {
  ticket: typeof tickets.$inferSelect;
  conversationNumber: number | null;
};

/** Turns stored rows into the SupportTicket shape the Agent view renders. */
async function hydrate(rows: TicketRow[]): Promise<SupportTicket[]> {
  if (rows.length === 0) return [];
  const ticketIds = rows.map((row) => row.ticket.id);
  const conversationIds = [
    ...new Set(rows.map((row) => row.ticket.conversationId)),
  ];
  const [replies, customerMessages, jevAnswers] = await Promise.all([
    db
      .select()
      .from(ticketReplies)
      .where(inArray(ticketReplies.ticketId, ticketIds))
      .orderBy(asc(ticketReplies.createdAt)),
    db
      .select()
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          eq(messages.sender, "customer"),
        ),
      )
      .orderBy(asc(messages.createdAt), asc(messages.id)),
    db
      .select({ messageId: responses.messageId, content: responses.content })
      .from(responses)
      .innerJoin(messages, eq(messages.id, responses.messageId))
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          eq(responses.mode, "with_jev"),
        ),
      ),
  ]);
  const answerByMessage = new Map(
    jevAnswers.map((answer) => [answer.messageId, answer.content]),
  );

  return rows.map(({ ticket, conversationNumber }) => {
    const code = ticketCode(ticket.number);
    const thread = customerMessages.filter(
      (message) => message.conversationId === ticket.conversationId,
    );
    const at = thread.findIndex((message) => message.id === ticket.messageId);
    // The escalated message, the one before it, and Jev's answer to it.
    const excerpt: TicketExcerptLine[] = thread
      .slice(Math.max(0, at - 1), at + 1)
      .flatMap((message) => {
        const lines: TicketExcerptLine[] = [
          {
            sender: "customer",
            label: "Pelanggan",
            content: message.content,
            createdAt: message.createdAt.toISOString(),
          },
        ];
        const answer =
          message.id === ticket.messageId && answerByMessage.get(message.id);
        if (answer)
          lines.push({
            sender: "bot",
            label: "Bot dengan Jev",
            content: answer,
            createdAt: message.createdAt.toISOString(),
          });
        return lines;
      });
    return {
      id: ticket.id,
      code,
      conversationId: ticket.conversationId,
      conversationCode: `#A-${conversationNumber ?? 0}`,
      messageId: ticket.messageId,
      title: ticket.title,
      priority: ticket.priority as SupportTicket["priority"],
      status: ticket.status as TicketStatus,
      claimedBy: ticket.claimedBy,
      product: ticket.product,
      issueLabel: ticket.issueLabel,
      frustrationScore: ticket.frustrationScore,
      churnRisk: ticket.churnRisk,
      summary: ticket.summary,
      summaryPoints: ticket.summaryPoints,
      nextStep: ticket.nextStep,
      escalationReason: ticket.escalationReason,
      excerpt,
      replies: replies
        .filter((reply) => reply.ticketId === ticket.id)
        .map((reply) => ({
          id: reply.id,
          ticketId: code,
          agentName: reply.agentName,
          content: reply.content,
          createdAt: reply.createdAt.toISOString(),
        })),
      createdAt: ticket.createdAt.toISOString(),
    };
  });
}

/**
 * The caller's support queue: tickets from their own conversations, filtered
 * and ordered with the same rules as the Agent view, plus per-status counts.
 */
export async function listTickets(userId: string, input: ListTicketsInput) {
  const rows = await db
    .select(ticketFields)
    .from(tickets)
    .innerJoin(conversations, eq(conversations.id, tickets.conversationId))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(tickets.createdAt))
    .limit(500);
  const counts: Record<TicketStatus, number> = {
    open: 0,
    claimed: 0,
    closed: 0,
  };
  for (const row of rows) counts[row.ticket.status as TicketStatus] += 1;
  const all = await hydrate(rows);
  const shown = sortTickets(
    filterTickets(all, input.filter, input.q),
    input.sort,
  ).slice(0, input.limit);
  return { data: shown, meta: { counts, total: rows.length } };
}
