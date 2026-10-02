import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import {
  createTestSet,
  listTestSets,
  MAX_UPLOADED_SETS,
} from "@/services/test-sets.service.server";
import { createTestSetSchema } from "@/validators/test-sets";

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
      POST: ({ request }) =>
        withApiSession(request, async (session) => {
          const input = createTestSetSchema.parse(await readJson(request));
          const result = await createTestSet(session.user.id, input);
          if (result.kind === "limit")
            throw new ApiError(
              409,
              "TOO_MANY_TEST_SETS",
              `Keep at most ${MAX_UPLOADED_SETS} uploaded test sets.`,
            );
          return Response.json({ data: result.set }, { status: 201 });
        }),
    },
  },
});
