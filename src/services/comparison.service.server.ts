import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { conversations, messages, responses } from "@/db/schema";
import { pickWinner, summarize, turnDelta } from "@/lib/lab/compare";
import { publishLabEvent } from "@/lib/lab/events.server";
import type { BotResponse, ConversationTurn } from "@/lib/lab/types";
import {
  getConversation,
  toBotResponse,
  toConversationSummary,
} from "./conversations.service.server";

/**
 * Side-by-side data for the Compare view: every message with both answers,
 * the per-message winner and difference, and the cumulative totals.
 */
export async function getComparison(userId: string, conversationId: string) {
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) return undefined;
  const { turns, ...summary } = conversation;
  return {
    conversation: summary,
    rows: turns.map((turn) => ({
      turn,
      winner: pickWinner(turn),
      delta: turnDelta(turn),
    })),
    summary: summarize(turns),
  };
}

/**
 * Cumulative totals for one conversation without loading message text: only
 * the metrics of each answer pair, in conversation order.
 */
export async function getConversationSummary(
  userId: string,
  conversationId: string,
) {
  const [conversation] = await db
    .select({
      id: conversations.id,
      number: conversations.number,
      title: conversations.title,
      status: conversations.status,
      activeView: conversations.activeView,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1);
  if (!conversation) return undefined;

  return {
    conversation: toConversationSummary(conversation),
    ...(await computeSummary(conversationId)),
  };
}

/**
 * Totals for a conversation whose ownership was already verified. Internal:
 * called by the owner-scoped summary and by the answer pipeline.
 */
async function computeSummary(conversationId: string) {
  const rows = await db
    .select({
      messageId: messages.id,
      mode: responses.mode,
      verdict: responses.verdict,
      latencyMs: responses.latencyMs,
      costUsd: responses.costUsd,
      flags: responses.flags,
    })
    .from(messages)
    .innerJoin(responses, eq(responses.messageId, messages.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt), asc(messages.id));

  const pairs = new Map<
    string,
    Pick<ConversationTurn, "withJev" | "withoutJev">
  >();
  for (const row of rows) {
    const pair = pairs.get(row.messageId) ?? {
      withJev: null,
      withoutJev: null,
    };
    const answer: BotResponse = {
      id: `${row.messageId}-${row.mode}`,
      messageId: row.messageId,
      mode: row.mode === "without_jev" ? "without_jev" : "with_jev",
      content: "",
      latencyMs: row.latencyMs,
      costUsd: Number(row.costUsd),
      isVerified: false,
      review: {
        verdict: row.verdict as BotResponse["review"]["verdict"],
        verdictLabel: "",
        issues: [],
        flags: row.flags,
      },
    };
    if (answer.mode === "with_jev") pair.withJev = answer;
    else pair.withoutJev = answer;
    pairs.set(row.messageId, pair);
  }
  const summary = summarize([...pairs.values()] as ConversationTurn[]);
  const { withJev, withoutJev } = summary;
  return {
    ...summary,
    speedup:
      withJev.latencyMs > 0 ? withoutJev.latencyMs / withJev.latencyMs : null,
    costSaving:
      withoutJev.costUsd > 0
        ? Math.round((1 - withJev.costUsd / withoutJev.costUsd) * 1e4) / 1e4
        : null,
  };
}

export type NewResponse = Omit<
  typeof responses.$inferInsert,
  "id" | "createdAt"
>;

/**
 * Stores one answer for a customer message. When this completes the pair,
 * subscribers of the conversation receive the new difference and totals.
 * The caller must already have verified that the message belongs to the user.
 */
export async function saveResponse(input: NewResponse) {
  const [saved] = await db.insert(responses).values(input).returning();
  const [owner] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, saved.messageId))
    .limit(1);
  if (owner)
    publishLabEvent({
      type: "answer",
      conversationId: owner.conversationId,
      messageId: saved.messageId,
      response: toBotResponse(saved),
    });
  const pair = await db
    .select()
    .from(responses)
    .where(eq(responses.messageId, saved.messageId));
  const jev = pair.find((row) => row.mode === "with_jev");
  const base = pair.find((row) => row.mode === "without_jev");
  if (jev && base) {
    const message = owner;
    if (message) {
      const turn = {
        withJev: toBotResponse(jev),
        withoutJev: toBotResponse(base),
      } as ConversationTurn;
      publishLabEvent({
        type: "comparison",
        conversationId: message.conversationId,
        messageId: saved.messageId,
        delta: turnDelta(turn),
        summary: await computeSummary(message.conversationId),
      });
    }
  }
  return toBotResponse(saved);
}
