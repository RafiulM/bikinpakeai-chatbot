import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { getTicket } from "@/services/tickets.service.server";
import { ticketIdSchema } from "@/validators/tickets";

export const Route = createFileRoute("/api/tickets/$id/")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = ticketIdSchema.safeParse(params.id);
          const ticket =
            id.success && (await getTicket(session.user.id, id.data));
          if (!ticket)
            throw new ApiError(404, "NOT_FOUND", "Ticket not found.");
          return Response.json({ data: ticket });
        }),
    },
  },
});
