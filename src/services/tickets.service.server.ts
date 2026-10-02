import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  conversations,
  messages,
  responses,
  ticketReplies,
  tickets,
} from "@/db/schema";
import { nextTicketStatus, ticketDraft } from "@/lib/lab/tickets";
import type {
  JevAnalysis,
  SupportTicket,
  TicketExcerptLine,
  TicketStatus,
} from "@/lib/lab/types";
import { publishLabEvent } from "@/lib/lab/events.server";
import type {
  ListTicketsInput,
  ReplyTicketInput,
  UpdateTicketInput,
} from "@/validators/tickets";

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

const PRIORITY_RANK = sql<number>`case ${tickets.priority}
  when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`;

/** Same order as sortTickets() in src/lib/lab/tickets.ts, done in SQL. */
function orderFor(sort: ListTicketsInput["sort"]) {
  if (sort === "frustration")
    return [
      desc(tickets.frustrationScore),
      asc(PRIORITY_RANK),
      asc(tickets.createdAt),
    ];
  if (sort === "waiting") return [asc(tickets.createdAt), asc(PRIORITY_RANK)];
  return [
    asc(PRIORITY_RANK),
    desc(tickets.frustrationScore),
    asc(tickets.createdAt),
  ];
}

/** Escapes LIKE wildcards so a search for "100%" matches literally. */
const likePattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * The caller's support queue: tickets from their own conversations, filtered,
 * searched and ordered by priority in SQL, plus counts per status.
 */
export async function listTickets(userId: string, input: ListTicketsInput) {
  const owned = eq(conversations.userId, userId);
  const status =
    input.filter === "active"
      ? inArray(tickets.status, ["open", "claimed"])
      : input.filter === "done"
        ? eq(tickets.status, "closed")
        : undefined;
  const search = input.q
    ? or(
        ilike(sql`'T-' || ${tickets.number}`, likePattern(input.q)),
        ilike(sql`'#A-' || ${conversations.number}`, likePattern(input.q)),
        ilike(tickets.product, likePattern(input.q)),
        ilike(tickets.issueLabel, likePattern(input.q)),
        ilike(tickets.summary, likePattern(input.q)),
      )
    : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select(ticketFields)
      .from(tickets)
      .innerJoin(conversations, eq(conversations.id, tickets.conversationId))
      .where(and(owned, status, search))
      .orderBy(...orderFor(input.sort))
      .limit(input.limit),
    db
      .select({ status: tickets.status, count: count() })
      .from(tickets)
      .innerJoin(conversations, eq(conversations.id, tickets.conversationId))
      .where(owned)
      .groupBy(tickets.status),
  ]);
  const counts: Record<TicketStatus, number> = {
    open: 0,
    claimed: 0,
    closed: 0,
  };
  for (const total of totals)
    counts[total.status as TicketStatus] = total.count;
  return {
    data: await hydrate(rows),
    meta: { counts, total: counts.open + counts.claimed + counts.closed },
  };
}

/** One ticket, only when it belongs to one of the caller's conversations. */
async function ownedTicketRow(userId: string, ticketId: string) {
  const [row] = await db
    .select(ticketFields)
    .from(tickets)
    .innerJoin(conversations, eq(conversations.id, tickets.conversationId))
    .where(and(eq(tickets.id, ticketId), eq(conversations.userId, userId)))
    .limit(1);
  return row;
}

export async function getTicket(userId: string, ticketId: string) {
  const row = await ownedTicketRow(userId, ticketId);
  return row ? (await hydrate([row]))[0] : undefined;
}

export type ReplyResult =
  | { kind: "ok"; ticket: SupportTicket }
  | { kind: "not_found" }
  | { kind: "closed" };

/**
 * Sends an agent reply to the customer. The reply appears in the customer's
 * conversation through the live stream; "close" also closes the ticket in
 * the same transaction.
 */
export async function replyToTicket(
  userId: string,
  ticketId: string,
  agentName: string,
  input: ReplyTicketInput,
): Promise<ReplyResult> {
  const outcome = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ ticket: tickets })
      .from(tickets)
      .innerJoin(conversations, eq(conversations.id, tickets.conversationId))
      .where(and(eq(tickets.id, ticketId), eq(conversations.userId, userId)))
      .for("update", { of: tickets })
      .limit(1);
    if (!row) return { kind: "not_found" } as const;
    if (row.ticket.status === "closed") return { kind: "closed" } as const;
    const [reply] = await tx
      .insert(ticketReplies)
      .values({
        ticketId,
        agentName: agentName.slice(0, 80),
        content: input.content,
      })
      .returning();
    if (input.close)
      await tx
        .update(tickets)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(tickets.id, ticketId));
    return { kind: "ok", ticket: row.ticket, reply } as const;
  });
  if (outcome.kind !== "ok") return outcome;

  publishLabEvent({
    type: "agent_reply",
    conversationId: outcome.ticket.conversationId,
    messageId: outcome.ticket.messageId,
    reply: {
      id: outcome.reply.id,
      ticketId: ticketCode(outcome.ticket.number),
      agentName: outcome.reply.agentName,
      content: outcome.reply.content,
      createdAt: outcome.reply.createdAt.toISOString(),
    },
  });
  const ticket = await getTicket(userId, ticketId);
  return ticket ? { kind: "ok", ticket } : { kind: "not_found" };
}

export type UpdateResult =
  | { kind: "ok"; ticket: SupportTicket }
  | { kind: "not_found" }
  | { kind: "invalid"; from: TicketStatus };

/** Claim, close, or reopen a ticket the caller owns. */
export async function updateTicketStatus(
  userId: string,
  ticketId: string,
  agentName: string,
  input: UpdateTicketInput,
): Promise<UpdateResult> {
  const outcome = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ ticket: tickets })
      .from(tickets)
      .innerJoin(conversations, eq(conversations.id, tickets.conversationId))
      .where(and(eq(tickets.id, ticketId), eq(conversations.userId, userId)))
      .for("update", { of: tickets })
      .limit(1);
    if (!row) return { kind: "not_found" } as const;
    const current = row.ticket.status as TicketStatus;
    const next = nextTicketStatus(current, input.status, row.ticket.claimedBy);
    if (!next) return { kind: "invalid", from: current } as const;
    await tx
      .update(tickets)
      .set({
        status: next,
        closedAt: next === "closed" ? new Date() : null,
        ...(next === "claimed" &&
          current === "open" && { claimedBy: agentName.slice(0, 80) }),
        ...(next === "open" && { claimedBy: null }),
      })
      .where(eq(tickets.id, ticketId));
    return { kind: "ok" } as const;
  });
  if (outcome.kind !== "ok") return outcome;
  const ticket = await getTicket(userId, ticketId);
  return ticket ? { kind: "ok", ticket } : { kind: "not_found" };
}
