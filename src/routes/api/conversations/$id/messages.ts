import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import { addCustomerMessage } from "@/services/conversations.service.server";
import { answerMessage } from "@/services/pipeline/orchestrator.server";
import type { ConversationTurn } from "@/lib/lab/types";
import {
  conversationIdSchema,
  sendMessageSchema,
} from "@/validators/conversations";

export const Route = createFileRoute("/api/conversations/$id/messages")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const conversationId = conversationIdSchema.safeParse(params.id);
          if (!conversationId.success)
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          const input = sendMessageSchema.parse(await readJson(request));
          const result = await addCustomerMessage(
            session.user.id,
            conversationId.data,
            input.content,
          );
          if (result.kind === "not_found")
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          if (result.kind === "ended")
            throw new ApiError(
              409,
              "CONVERSATION_ENDED",
              "This conversation has ended. Start a new one.",
            );
          // The customer gets the Jev answer now; the answer without Jev
          // follows through the conversation's live event stream.
          const turn: ConversationTurn = {
            message: result.message,
            analysis: null,
            withJev: null,
            withoutJev: null,
            ticketId: null,
          };
          try {
            const { jev } = await answerMessage({
              messageId: result.message.id,
              rawText: input.content,
              maskedText: result.message.content,
              masked: result.message.isMasked,
            });
            turn.analysis = jev.analysis;
            turn.withJev = jev.withJev;
            turn.ticketId = jev.ticketId;
            if (jev.analysisError) {
              turn.analysisStatus = "failed";
              turn.analysisError = jev.analysisError;
            }
          } catch (error) {
            console.error(
              "Answer pipeline failed:",
              error instanceof Error ? error.name : "UnknownError",
            );
          }
          return Response.json(
            { data: { message: result.message, turn } },
            { status: 201 },
          );
        }),
    },
  },
});
