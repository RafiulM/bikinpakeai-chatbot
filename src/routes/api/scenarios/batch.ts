import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import { runScenarioBatch } from "@/services/scenarios.service.server";
import { runBatchSchema } from "@/validators/scenarios";

export const Route = createFileRoute("/api/scenarios/batch")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withApiSession(request, async (session) => {
          const input = runBatchSchema.parse(await readJson(request));
          const result = await runScenarioBatch(
            session.user.id,
            input.conversationId,
            input.scenarioIds,
            request.signal,
          );
          if (result.kind === "unknown_scenarios")
            return Response.json(
              {
                error: {
                  code: "NOT_FOUND",
                  message: "Some scenarios do not exist.",
                  details: result.ids.map((id) => ({
                    field: "scenarioIds",
                    message: id,
                  })),
                },
              },
              { status: 404 },
            );
          if (result.kind === "not_found")
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          if (result.kind === "ended")
            throw new ApiError(
              409,
              "CONVERSATION_ENDED",
              "This conversation has ended. Start a new one.",
            );
          const done = result.results.filter(
            (item) => item.status === "done",
          ).length;
          return Response.json({
            data: { results: result.results },
            meta: { total: result.results.length, done },
          });
        }),
    },
  },
});
