import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { getComparison } from "@/services/comparison.service.server";
import { conversationIdSchema } from "@/validators/conversations";

export const Route = createFileRoute("/api/conversations/$id/comparison")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = conversationIdSchema.safeParse(params.id);
          const comparison =
            id.success && (await getComparison(session.user.id, id.data));
          if (!comparison)
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          return Response.json({ data: comparison });
        }),
    },
  },
});
