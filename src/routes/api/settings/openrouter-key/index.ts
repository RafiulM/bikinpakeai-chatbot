import { createFileRoute } from "@tanstack/react-router";
import { readJson, withApiSession } from "@/lib/api.server";
import {
  deleteOpenRouterKey,
  saveOpenRouterKey,
} from "@/services/ai-settings.service.server";
import { saveOpenRouterKeySchema } from "@/validators/settings";

// The caller's own OpenRouter key: PUT saves or replaces it (stored
// encrypted), DELETE removes it. Both answer with the settings, never the key.
export const Route = createFileRoute("/api/settings/openrouter-key/")({
  server: {
    handlers: {
      PUT: ({ request }) =>
        withApiSession(request, async (session) => {
          const { apiKey } = saveOpenRouterKeySchema.parse(
            await readJson(request),
          );
          return Response.json({
            data: await saveOpenRouterKey(session.user.id, apiKey),
          });
        }),
      DELETE: ({ request }) =>
        withApiSession(request, async (session) =>
          Response.json({ data: await deleteOpenRouterKey(session.user.id) }),
        ),
    },
  },
});
