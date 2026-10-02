import type { ConversationTurn } from "@/lib/lab/types";
import { addCustomerMessage } from "./conversations.service.server";
import { answerMessage } from "./pipeline/orchestrator.server";
import { createTicketForEscalation } from "./tickets.service.server";

export type SendResult =
  | { kind: "ok"; turn: ConversationTurn }
  | { kind: "not_found" }
  | { kind: "ended" };

/**
 * One customer message end to end: store it (masked), run both answer paths,
 * open a ticket when Jev escalates, and return the turn with the Jev answer.
 * The answer without Jev arrives later through the live event stream.
 */
export async function sendCustomerMessage(
  userId: string,
  conversationId: string,
  content: string,
  scenarioId?: string,
): Promise<SendResult> {
  const stored = await addCustomerMessage(
    userId,
    conversationId,
    content,
    scenarioId,
  );
  if (stored.kind !== "ok") return stored;

  const turn: ConversationTurn = {
    message: stored.message,
    analysis: null,
    withJev: null,
    withoutJev: null,
    ticketId: null,
  };
  try {
    const { jev } = await answerMessage({
      messageId: stored.message.id,
      rawText: content,
      maskedText: stored.message.content,
      masked: stored.message.isMasked,
      onEscalate: ({ messageId, analysis, refundRequested }) =>
        createTicketForEscalation(messageId, analysis, refundRequested),
    });
    turn.analysis = jev.analysis;
    turn.withJev = jev.withJev;
    turn.ticketId = jev.ticketId;
    if (jev.analysisError) {
      turn.analysisStatus = "failed";
      turn.analysisError = jev.analysisError;
    }
  } catch (error) {
    // The message is stored either way; the views show it as unanswered.
    console.error(
      "Answer pipeline failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
  return { kind: "ok", turn };
}
