import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import {
  getConversation,
  updateConversation,
} from "@/services/conversations.service.server";
import {
  conversationIdSchema,
  updateConversationSchema,
} from "@/validators/conversations";

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
      PATCH: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = conversationIdSchema.safeParse(params.id);
          const input = updateConversationSchema.parse(await readJson(request));
          const conversation =
            id.success &&
            (await updateConversation(session.user.id, id.data, input));
          if (!conversation)
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          return Response.json({ data: conversation });
        }),
    },
  },
});
