import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { listSuggestions } from "@/services/suggestions.service.server";
import { listSuggestionsSchema } from "@/validators/conversations";

export const Route = createFileRoute("/api/suggestions")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async () => {
          const { limit } = listSuggestionsSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json({ data: listSuggestions(limit) });
        }),
    },
  },
});
