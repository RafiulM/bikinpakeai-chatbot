import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import { addCustomerMessage } from "@/services/conversations.service.server";
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
          return Response.json(
            { data: { message: result.message } },
            { status: 201 },
          );
        }),
    },
  },
});
