import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { conversations, messages, responses } from "@/db/schema";
import { pickWinner, summarize, turnDelta } from "@/lib/lab/compare";
import type { BotResponse, ConversationTurn } from "@/lib/lab/types";
import {
  getConversation,
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
    conversation: toConversationSummary(conversation),
    ...summary,
    speedup:
      withJev.latencyMs > 0 ? withoutJev.latencyMs / withJev.latencyMs : null,
    costSaving:
      withoutJev.costUsd > 0
        ? Math.round((1 - withJev.costUsd / withoutJev.costUsd) * 1e4) / 1e4
        : null,
  };
}
