import { createFileRoute } from "@tanstack/react-router";
import { readJson, withApiSession } from "@/lib/api.server";
import { seedDemoData } from "@/services/demo.service.server";
import { seedDemoSchema } from "@/validators/settings";

// Fills the caller's account with demo data through the real pipeline: a new
// conversation from ready-made scenarios (with its tickets), then every
// built-in test set runs in the background. Answers once the chat is ready.
export const Route = createFileRoute("/api/demo/seed")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withApiSession(request, async (session) => {
          seedDemoSchema.parse(await readJson(request));
          const result = await seedDemoData(session.user.id, request.signal);
          return Response.json({ data: result }, { status: 201 });
        }),
    },
  },
});
