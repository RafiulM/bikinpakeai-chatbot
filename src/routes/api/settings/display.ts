import { createFileRoute } from "@tanstack/react-router";
import { readJson, withApiSession } from "@/lib/api.server";
import {
  getDisplaySettings,
  saveDisplaySettings,
} from "@/services/display-settings.service.server";
import { saveDisplaySettingsSchema } from "@/validators/settings";

// How the caller's Chat looks: demo mode on (both answers side by side) or
// off (one chatbot, the chosen path, as a customer sees it).
export const Route = createFileRoute("/api/settings/display")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) =>
          Response.json({ data: await getDisplaySettings(session.user.id) }),
        ),
      PUT: ({ request }) =>
        withApiSession(request, async (session) => {
          const input = saveDisplaySettingsSchema.parse(
            await readJson(request),
          );
          return Response.json({
            data: await saveDisplaySettings(session.user.id, input),
          });
        }),
    },
  },
});
