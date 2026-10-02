import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiPermission } from "@/lib/api.server";
import { deleteAnyNote } from "@/services/notes.service.server";
import { noteIdSchema } from "@/validators/notes";

// Deletes another account's note. The Origin check in withApiSession still
// applies, so a permitted role cannot be used from a cross-site request.
export const Route = createFileRoute("/api/admin/notes/$id")({
  server: {
    handlers: {
      DELETE: ({ request, params }) =>
        withApiPermission(request, { notes: ["delete-any"] }, async () => {
          const id = noteIdSchema.parse(params.id);
          if (!(await deleteAnyNote(id)))
            throw new ApiError(404, "NOT_FOUND", "Note not found.");
          return new Response(null, { status: 204 });
        }),
    },
  },
});
