import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { conversations, messages } from "@/db/schema";
import { maskSensitive } from "@/lib/lab/mask";
import type {
  ConversationTurn,
  LabConversation,
  LabMessage,
} from "@/lib/lab/types";
import type { ListConversationsInput } from "@/validators/conversations";

// Conversations and customer messages. Every query is scoped to the verified
// session user; the caller never supplies an owner.

const DEFAULT_TITLE = "Percakapan baru";

const conversationFields = {
  id: conversations.id,
  number: conversations.number,
  title: conversations.title,
  status: conversations.status,
  createdAt: conversations.createdAt,
};

type ConversationRow = {
  id: string;
  number: number | null;
  title: string;
  status: string;
  createdAt: Date;
};

export function toConversationSummary(row: ConversationRow) {
  return {
    id: row.id,
    code: `#A-${row.number ?? 0}`,
    title: row.title,
    status: row.status as "active" | "ended",
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

export async function createConversation(userId: string) {
  const [row] = await db
    .insert(conversations)
    .values({ userId })
    .returning(conversationFields);
  return toConversationSummary(row);
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
export function buildTurns(rows: LabMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  for (const message of rows) {
    if (message.sender === "customer") {
      turns.push({
        message,
        analysis: null,
        withJev: null,
        withoutJev: null,
        ticketId: null,
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
  return {
    ...toConversationSummary(conversation),
    turns: buildTurns(rows.map(toLabMessage)),
  };
}
