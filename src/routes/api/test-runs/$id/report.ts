import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { getTestRunReport } from "@/services/test-runs.service.server";
import { testRunIdSchema } from "@/validators/test-sets";

// Report of one run: verdict totals, average time and total cost per version,
// right answers per issue category, and every message's two outcomes.
export const Route = createFileRoute("/api/test-runs/$id/report")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = testRunIdSchema.safeParse(params.id);
          const report =
            id.success && (await getTestRunReport(session.user.id, id.data));
          if (!report)
            throw new ApiError(404, "NOT_FOUND", "Test run not found.");
          return Response.json({ data: report });
        }),
    },
  },
});
