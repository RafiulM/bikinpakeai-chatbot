import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/index.server";
import { messages, ticketReplies, tickets } from "@/db/schema";
import { ticketDraft } from "@/lib/lab/tickets";
import type { JevAnalysis } from "@/lib/lab/types";

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
