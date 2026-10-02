import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { cancelTestRun } from "@/services/test-runs.service.server";
import { testRunIdSchema } from "@/validators/test-sets";

export const Route = createFileRoute("/api/test-runs/$id/cancel")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = testRunIdSchema.safeParse(params.id);
          const result = id.success
            ? await cancelTestRun(session.user.id, id.data)
            : { kind: "not_found" as const };
          if (result.kind === "not_found")
            throw new ApiError(404, "NOT_FOUND", "Test run not found.");
          if (result.kind === "not_running")
            throw new ApiError(
              409,
              "RUN_NOT_RUNNING",
              `This test run is already ${result.run.status}.`,
            );
          return Response.json({ data: result.run });
        }),
    },
  },
});
