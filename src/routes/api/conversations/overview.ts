import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { conversationOverview } from "@/services/conversations.service.server";
import { conversationFilterSchema } from "@/validators/conversations";

// How Jev read the caller's saved conversations, with the same search and
// status filter as the session list.
export const Route = createFileRoute("/api/conversations/overview")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const filter = conversationFilterSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json({
            data: await conversationOverview(session.user.id, filter),
          });
        }),
    },
  },
});
