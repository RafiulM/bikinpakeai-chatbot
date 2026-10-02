import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { getDebugCards } from "@/services/debug.service.server";
import { conversationIdSchema } from "@/validators/conversations";

export const Route = createFileRoute("/api/conversations/$id/debug")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = conversationIdSchema.safeParse(params.id);
          const debug =
            id.success && (await getDebugCards(session.user.id, id.data));
          if (!debug)
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          return Response.json({ data: debug });
        }),
    },
  },
});
