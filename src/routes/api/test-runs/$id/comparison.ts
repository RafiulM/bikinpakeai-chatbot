import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { compareScores } from "@/lib/lab/test-report";
import { getTestRunReport } from "@/services/test-runs.service.server";
import { comparisonQuerySchema, testRunIdSchema } from "@/validators/test-sets";

// Final score of both versions side by side for one run, as a conclusion:
// scores, verdict counts, speed and cost, the gap in points, and per-category
// scores. `?category=` narrows it to one issue category.
export const Route = createFileRoute("/api/test-runs/$id/comparison")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const { category } = comparisonQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          const id = testRunIdSchema.safeParse(params.id);
          const report =
            id.success && (await getTestRunReport(session.user.id, id.data));
          if (!report)
            throw new ApiError(404, "NOT_FOUND", "Test run not found.");
          return Response.json({
            data: {
              runId: report.runId,
              runNumber: report.runNumber,
              testSetName: report.testSetName,
              status: report.status,
              ...compareScores(report, category ?? null),
            },
          });
        }),
    },
  },
});
