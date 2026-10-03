import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { getAiSettings } from "@/services/ai-settings.service.server";

// Which OpenRouter key the caller's work uses and the model per role. The key
// itself is never returned, only its last characters.
export const Route = createFileRoute("/api/settings/ai")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) =>
          Response.json({ data: await getAiSettings(session.user.id) }),
        ),
    },
  },
});
