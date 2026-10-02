import { summarize, pickWinner, turnDelta } from "@/lib/lab/compare";
import { getConversation } from "./conversations.service.server";

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
