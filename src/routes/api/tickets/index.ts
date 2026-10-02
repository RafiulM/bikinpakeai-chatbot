import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { listTickets } from "@/services/tickets.service.server";
import { listTicketsSchema } from "@/validators/tickets";

export const Route = createFileRoute("/api/tickets/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const query = listTicketsSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json(await listTickets(session.user.id, query));
        }),
    },
  },
});
