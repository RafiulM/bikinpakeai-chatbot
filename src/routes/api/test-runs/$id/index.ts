import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { getTestRunState } from "@/services/test-runs.service.server";
import { testRunIdSchema } from "@/validators/test-sets";

export const Route = createFileRoute("/api/test-runs/$id/")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = testRunIdSchema.safeParse(params.id);
          const run =
            id.success && (await getTestRunState(session.user.id, id.data));
          if (!run) throw new ApiError(404, "NOT_FOUND", "Test run not found.");
          return Response.json({ data: run });
        }),
    },
  },
});
