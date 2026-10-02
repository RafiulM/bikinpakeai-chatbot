import { createFileRoute } from "@tanstack/react-router";
import { withApiPermission } from "@/lib/api.server";
import { listAnyNotes } from "@/services/notes.service.server";
import { listNotesSchema } from "@/validators/notes";

// Every account's notes. withApiPermission answers 401 without a session and
// 403 without the notes:read-any permission, before the service runs.
export const Route = createFileRoute("/api/admin/notes/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiPermission(request, { notes: ["read-any"] }, async () => {
          const query = listNotesSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json(await listAnyNotes(query));
        }),
    },
  },
});
