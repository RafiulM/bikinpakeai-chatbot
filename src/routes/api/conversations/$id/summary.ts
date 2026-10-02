import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { getConversationSummary } from "@/services/comparison.service.server";
import { conversationIdSchema } from "@/validators/conversations";

export const Route = createFileRoute("/api/conversations/$id/summary")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = conversationIdSchema.safeParse(params.id);
          const summary =
            id.success &&
            (await getConversationSummary(session.user.id, id.data));
          if (!summary)
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          return Response.json({ data: summary });
        }),
    },
  },
});
