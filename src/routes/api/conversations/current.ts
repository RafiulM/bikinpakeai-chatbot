import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { getActiveConversation } from "@/services/conversations.service.server";

// The newest active conversation, or null when the account has none yet.
export const Route = createFileRoute("/api/conversations/current")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) =>
          Response.json({
            data: (await getActiveConversation(session.user.id)) ?? null,
          }),
        ),
    },
  },
});
