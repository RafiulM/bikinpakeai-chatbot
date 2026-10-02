import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import { sendCustomerMessage } from "@/services/messaging.service.server";
import { getScenario } from "@/services/scenarios.service.server";
import { runScenarioSchema, scenarioIdSchema } from "@/validators/scenarios";

// Sends a ready-made scenario into one of the caller's conversations, through
// exactly the same pipeline as a typed customer message.
export const Route = createFileRoute("/api/scenarios/$id/run")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = scenarioIdSchema.safeParse(params.id);
          const scenario = id.success && (await getScenario(id.data));
          if (!scenario)
            throw new ApiError(404, "NOT_FOUND", "Scenario not found.");
          const { conversationId } = runScenarioSchema.parse(
            await readJson(request),
          );
          const result = await sendCustomerMessage(
            session.user.id,
            conversationId,
            scenario.prompt,
            scenario.id,
          );
          if (result.kind === "not_found")
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          if (result.kind === "ended")
            throw new ApiError(
              409,
              "CONVERSATION_ENDED",
              "This conversation has ended. Start a new one.",
            );
          return Response.json(
            { data: { scenario, turn: result.turn } },
            { status: 201 },
          );
        }),
    },
  },
});
