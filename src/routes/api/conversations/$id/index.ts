import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { getConversation } from "@/services/conversations.service.server";
import { conversationIdSchema } from "@/validators/conversations";

export const Route = createFileRoute("/api/conversations/$id/")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = conversationIdSchema.safeParse(params.id);
          const conversation =
            id.success && (await getConversation(session.user.id, id.data));
          if (!conversation)
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          return Response.json({ data: conversation });
        }),
    },
  },
});
