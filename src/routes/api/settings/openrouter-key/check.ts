import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { checkOpenRouterKey } from "@/services/ai-settings.service.server";

// Asks OpenRouter whether the key in use is accepted and how much credit is
// left. Reads the key's own account data only; no model is called.
export const Route = createFileRoute("/api/settings/openrouter-key/check")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withApiSession(request, async (session) =>
          Response.json({ data: await checkOpenRouterKey(session.user.id) }),
        ),
    },
  },
});
