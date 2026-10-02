import type { ConversationTurn } from "@/lib/lab/types";
import { getConversation } from "./conversations.service.server";

type CardStatus = "done" | "failed" | "pending";

function cardStatus(turn: ConversationTurn): CardStatus {
  if (turn.analysis) return "done";
  return turn.analysisStatus === "failed" ? "failed" : "pending";
}

/**
 * The Debug view's data: one card per customer message with Jev's reading,
 * plus counts for the summary strip. Undefined when not the caller's.
 */
export async function getDebugCards(userId: string, conversationId: string) {
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) return undefined;
  const cards = conversation.turns.map((turn) => ({
    message: turn.message,
    status: cardStatus(turn),
    error: turn.analysisError ?? null,
    analysis: turn.analysis,
    ticketId: turn.ticketId,
    withJev: turn.withJev
      ? { latencyMs: turn.withJev.latencyMs, costUsd: turn.withJev.costUsd }
      : null,
    withoutJev: turn.withoutJev
      ? {
          latencyMs: turn.withoutJev.latencyMs,
          costUsd: turn.withoutJev.costUsd,
        }
      : null,
  }));
  const done = cards.filter((card) => card.analysis);
  const count = (decision: string) =>
    done.filter((card) => card.analysis?.decision === decision).length;
  const answered = cards.filter((card) => card.withJev);
  const totalLatency = answered.reduce(
    (sum, card) => sum + (card.withJev?.latencyMs ?? 0),
    0,
  );
  return {
    conversation: {
      id: conversation.id,
      code: conversation.code,
      title: conversation.title,
      status: conversation.status,
    },
    cards,
    summary: {
      analyzed: done.length,
      failed: cards.filter((card) => card.status === "failed").length,
      pending: cards.filter((card) => card.status === "pending").length,
      masked: count("masked"),
      blocked: count("blocked"),
      escalated: count("escalated"),
      averageLatencyMs: answered.length
        ? Math.round(totalLatency / answered.length)
        : 0,
      totalCostUsd: answered.reduce(
        (sum, card) => sum + (card.withJev?.costUsd ?? 0),
        0,
      ),
    },
  };
}
