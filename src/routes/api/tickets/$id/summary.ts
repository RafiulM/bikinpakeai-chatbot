import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { regenerateTicketSummary } from "@/services/tickets.service.server";
import { ticketIdSchema } from "@/validators/tickets";

// Rebuilds the "Ringkasan masalah" briefing from the conversation so far.
export const Route = createFileRoute("/api/tickets/$id/summary")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = ticketIdSchema.safeParse(params.id);
          const ticket =
            id.success &&
            (await regenerateTicketSummary(session.user.id, id.data));
          if (!ticket)
            throw new ApiError(404, "NOT_FOUND", "Ticket not found.");
          return Response.json({ data: ticket });
        }),
    },
  },
});
