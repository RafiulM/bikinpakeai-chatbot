import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/index.server";
import { conversations, jevAnalyses, messages, responses } from "@/db/schema";
import { maskSensitive } from "@/lib/lab/mask";
import { toJevAnalysis } from "./jev.service.server";
import { ticketsForMessages } from "./tickets.service.server";
import { VIEW_IDS, type ViewId } from "@/lib/lab/types";
import type {
  BotResponse,
  ConversationTurn,
  LabConversation,
  LabMessage,
} from "@/lib/lab/types";
import type {
  ListConversationsInput,
  UpdateConversationInput,
} from "@/validators/conversations";

// Conversations and customer messages. Every query is scoped to the verified
// session user; the caller never supplies an owner.

const DEFAULT_TITLE = "Percakapan baru";

const conversationFields = {
  id: conversations.id,
  number: conversations.number,
  title: conversations.title,
  status: conversations.status,
  activeView: conversations.activeView,
  createdAt: conversations.createdAt,
};

type ConversationRow = {
  id: string;
  number: number | null;
  title: string;
  status: string;
  activeView?: string;
  createdAt: Date;
};

export function toConversationSummary(row: ConversationRow) {
  return {
    id: row.id,
    code: `#A-${row.number ?? 0}`,
    title: row.title,
    status: row.status as "active" | "ended",
    activeView: (VIEW_IDS as readonly string[]).includes(row.activeView ?? "")
      ? (row.activeView as ViewId)
      : "customer",
    createdAt: row.createdAt.toISOString(),
  };
}

export function toLabMessage(row: {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  isMasked: boolean;
  createdAt: Date;
}): LabMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    sender: row.sender === "agent" ? "agent" : "customer",
    content: row.content,
    isMasked: row.isMasked,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Starts a new conversation. Any conversation still active for this account
 * is ended in the same transaction, so there is exactly one active
 * conversation and its history stays intact.
 */
export async function startConversation(userId: string) {
  return db.transaction(async (tx) => {
    const ended = await tx
      .update(conversations)
      .set({ status: "ended" })
      .where(
        and(
          eq(conversations.userId, userId),
          eq(conversations.status, "active"),
        ),
      )
      .returning({ id: conversations.id });
    const [row] = await tx
      .insert(conversations)
      .values({ userId })
      .returning(conversationFields);
    return {
      conversation: toConversationSummary(row),
      endedIds: ended.map((item) => item.id),
    };
  });
}

export type AddMessageResult =
  | { kind: "ok"; message: LabMessage }
  | { kind: "not_found" }
  | { kind: "ended" };

/**
 * Stores a customer message. Sensitive data is masked before it is written,
 * so the original text never reaches the database. The first message names
 * a conversation that still has the default title.
 */
export async function addCustomerMessage(
  userId: string,
  conversationId: string,
  content: string,
): Promise<AddMessageResult> {
  const masked = maskSensitive(content);
  return db.transaction(async (tx) => {
    const [conversation] = await tx
      .select({
        id: conversations.id,
        status: conversations.status,
        title: conversations.title,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .for("update")
      .limit(1);
    if (!conversation) return { kind: "not_found" } as const;
    if (conversation.status !== "active") return { kind: "ended" } as const;

    const [row] = await tx
      .insert(messages)
      .values({
        conversationId,
        sender: "customer",
        content: masked.text,
        isMasked: masked.masked,
      })
      .returning();

    if (conversation.title === DEFAULT_TITLE) {
      const title =
        masked.text.length > 60 ? `${masked.text.slice(0, 59)}…` : masked.text;
      await tx
        .update(conversations)
        .set({ title })
        .where(eq(conversations.id, conversationId));
    } else {
      await tx
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
    return { kind: "ok", message: toLabMessage(row) } as const;
  });
}

/** Most recent conversations first, with how many messages each holds. */
export async function listConversations(
  userId: string,
  { limit, offset }: ListConversationsInput,
) {
  const rows = await db
    .select({ ...conversationFields, messageCount: count(messages.id) })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.userId, userId))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.createdAt), desc(conversations.id))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit).map((row) => ({
      ...toConversationSummary(row),
      messageCount: row.messageCount,
    })),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

/**
 * Groups stored messages into turns: each customer message opens a turn, and
 * human-agent messages attach to the turn they answer.
 */
export function toBotResponse(row: typeof responses.$inferSelect): BotResponse {
  return {
    id: row.id,
    messageId: row.messageId,
    mode: row.mode === "without_jev" ? "without_jev" : "with_jev",
    content: row.content,
    latencyMs: row.latencyMs,
    costUsd: Number(row.costUsd),
    isVerified: row.isVerified,
    review: {
      verdict: row.verdict as BotResponse["review"]["verdict"],
      verdictLabel: row.verdictLabel,
      issues: row.issues,
      flags: row.flags,
      highlight: row.highlight ?? undefined,
      highlightTone:
        row.highlightTone === "good" || row.highlightTone === "bad"
          ? row.highlightTone
          : undefined,
    },
  };
}

export function buildTurns(
  rows: LabMessage[],
  answers: (typeof responses.$inferSelect)[] = [],
  readings: (typeof jevAnalyses.$inferSelect)[] = [],
  ticketRows: Awaited<ReturnType<typeof ticketsForMessages>> = [],
): ConversationTurn[] {
  const ticketByMessage = new Map(
    ticketRows.map((ticket) => [ticket.messageId, ticket]),
  );
  const readingByMessage = new Map(
    readings.map((reading) => [reading.messageId, reading]),
  );
  const byMessage = new Map<string, (typeof responses.$inferSelect)[]>();
  for (const answer of answers) {
    byMessage.set(answer.messageId, [
      ...(byMessage.get(answer.messageId) ?? []),
      answer,
    ]);
  }
  const turns: ConversationTurn[] = [];
  for (const message of rows) {
    if (message.sender === "customer") {
      const pair = byMessage.get(message.id) ?? [];
      const jev = pair.find((answer) => answer.mode === "with_jev");
      const base = pair.find((answer) => answer.mode === "without_jev");
      const reading = readingByMessage.get(message.id);
      turns.push({
        message,
        analysis: reading ? toJevAnalysis(reading) : null,
        ...(reading?.status === "failed" && {
          analysisStatus: "failed" as const,
          analysisError: reading.error ?? undefined,
        }),
        withJev: jev ? toBotResponse(jev) : null,
        withoutJev: base ? toBotResponse(base) : null,
        ticketId: ticketByMessage.get(message.id)?.code ?? null,
        ...(ticketByMessage.get(message.id)?.replies.length && {
          agentReplies: ticketByMessage.get(message.id)?.replies,
        }),
        ...(jev?.takeaway && { takeaway: jev.takeaway }),
      });
      continue;
    }
    const last = turns.at(-1);
    if (!last) continue;
    last.agentReplies = [
      ...(last.agentReplies ?? []),
      {
        id: message.id,
        ticketId: last.ticketId ?? "",
        agentName: "Tim Support",
        content: message.content,
        createdAt: message.createdAt,
      },
    ];
  }
  return turns;
}

/** The full conversation for every view, or undefined when it is not the caller's. */
export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<LabConversation | undefined> {
  const [conversation] = await db
    .select(conversationFields)
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1);
  if (!conversation) return undefined;
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt), asc(messages.id));
  const ids = rows.map((row) => row.id);
  const [answers, readings, ticketRows] = ids.length
    ? await Promise.all([
        db.select().from(responses).where(inArray(responses.messageId, ids)),
        db
          .select()
          .from(jevAnalyses)
          .where(inArray(jevAnalyses.messageId, ids)),
        ticketsForMessages(ids),
      ])
    : [[], [], []];
  return {
    ...toConversationSummary(conversation),
    turns: buildTurns(rows.map(toLabMessage), answers, readings, ticketRows),
  };
}

/** The caller's newest active conversation, used when no ?c is given. */
export async function getActiveConversation(userId: string) {
  const [active] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.userId, userId), eq(conversations.status, "active")),
    )
    .orderBy(desc(conversations.createdAt), desc(conversations.id))
    .limit(1);
  return active ? getConversation(userId, active.id) : undefined;
}

/**
 * The conversation a view should open: the requested one when it belongs to
 * the caller, otherwise the newest active one. `requestedFound` tells the UI
 * whether a shared link pointed at a conversation it cannot open.
 */
export async function resolveConversation(
  userId: string,
  requestedId?: string,
) {
  if (requestedId) {
    const requested = await getConversation(userId, requestedId);
    if (requested) return { conversation: requested, requestedFound: true };
  }
  return {
    conversation: (await getActiveConversation(userId)) ?? null,
    requestedFound: !requestedId,
  };
}

/** Remembers which view the caller last used for a conversation. */
export async function updateConversation(
  userId: string,
  conversationId: string,
  input: UpdateConversationInput,
) {
  const [row] = await db
    .update(conversations)
    .set({ activeView: input.activeView })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .returning(conversationFields);
  return row ? toConversationSummary(row) : undefined;
}
