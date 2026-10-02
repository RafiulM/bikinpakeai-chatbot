import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import { replyToTicket } from "@/services/tickets.service.server";
import { replyTicketSchema, ticketIdSchema } from "@/validators/tickets";

export const Route = createFileRoute("/api/tickets/$id/replies")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = ticketIdSchema.safeParse(params.id);
          if (!id.success)
            throw new ApiError(404, "NOT_FOUND", "Ticket not found.");
          const input = replyTicketSchema.parse(await readJson(request));
          const result = await replyToTicket(
            session.user.id,
            id.data,
            session.user.name,
            input,
          );
          if (result.kind === "not_found")
            throw new ApiError(404, "NOT_FOUND", "Ticket not found.");
          if (result.kind === "closed")
            throw new ApiError(
              409,
              "TICKET_CLOSED",
              "This ticket is closed. Reopen it to reply.",
            );
          return Response.json({ data: result.ticket }, { status: 201 });
        }),
    },
  },
});
