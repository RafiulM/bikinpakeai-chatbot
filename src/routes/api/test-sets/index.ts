import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { listTestSets } from "@/services/test-sets.service.server";

export const Route = createFileRoute("/api/test-sets/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const sets = await listTestSets(session.user.id);
          return Response.json({
            data: sets,
            meta: { total: sets.length },
          });
        }),
    },
  },
});
