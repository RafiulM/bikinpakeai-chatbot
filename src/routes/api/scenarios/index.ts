import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { listScenarioGroups } from "@/services/scenarios.service.server";
import { listScenariosSchema } from "@/validators/scenarios";

export const Route = createFileRoute("/api/scenarios/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async () => {
          const { category } = listScenariosSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          const groups = await listScenarioGroups(category);
          return Response.json({
            data: groups,
            meta: {
              total: groups.reduce((sum, group) => sum + group.count, 0),
            },
          });
        }),
    },
  },
});
