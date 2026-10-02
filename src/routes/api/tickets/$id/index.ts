import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import {
  getTicket,
  updateTicketStatus,
} from "@/services/tickets.service.server";
import { ticketIdSchema, updateTicketSchema } from "@/validators/tickets";

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
      PATCH: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = ticketIdSchema.safeParse(params.id);
          if (!id.success)
            throw new ApiError(404, "NOT_FOUND", "Ticket not found.");
          const input = updateTicketSchema.parse(await readJson(request));
          const result = await updateTicketStatus(
            session.user.id,
            id.data,
            session.user.name,
            input,
          );
          if (result.kind === "not_found")
            throw new ApiError(404, "NOT_FOUND", "Ticket not found.");
          if (result.kind === "invalid")
            throw new ApiError(
              409,
              "INVALID_TRANSITION",
              `A ${result.from} ticket cannot become ${input.status}.`,
            );
          return Response.json({ data: result.ticket });
        }),
    },
  },
});
