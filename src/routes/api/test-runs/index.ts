import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import {
  listTestRuns,
  startTestRun,
} from "@/services/test-runs.service.server";
import { listTestRunsSchema, startTestRunSchema } from "@/validators/test-sets";

export const Route = createFileRoute("/api/test-runs/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const { limit, status } = listTestRunsSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          const runs = await listTestRuns(session.user.id, limit, status);
          return Response.json({ data: runs, meta: { total: runs.length } });
        }),
      // Starts a run and returns at once; follow it with GET /api/test-runs/:id
      // or the events stream at /api/test-runs/:id/events.
      POST: ({ request }) =>
        withApiSession(request, async (session) => {
          const { testSetId } = startTestRunSchema.parse(
            await readJson(request),
          );
          const result = await startTestRun(session.user.id, testSetId);
          if (result.kind === "not_found")
            throw new ApiError(404, "NOT_FOUND", "Test set not found.");
          if (result.kind === "busy")
            return Response.json(
              {
                error: {
                  code: "RUN_IN_PROGRESS",
                  message: "A test run is already in progress.",
                  details: [{ field: "runId", message: result.runId }],
                },
              },
              { status: 409 },
            );
          return Response.json({ data: result.run }, { status: 202 });
        }),
    },
  },
});
