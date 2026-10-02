import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import {
  deleteNote,
  getNote,
  updateNote,
} from "@/services/notes.service.server";
import { noteIdSchema, updateNoteSchema } from "@/validators/notes";

export const Route = createFileRoute("/api/notes/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = noteIdSchema.parse(params.id);
          const note = await getNote(session.user.id, id);
          if (!note) throw new ApiError(404, "NOT_FOUND", "Note not found.");
          return Response.json({ data: note });
        }),
      PATCH: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = noteIdSchema.parse(params.id);
          const input = updateNoteSchema.parse(await readJson(request));
          const note = await updateNote(session.user.id, id, input);
          if (!note) throw new ApiError(404, "NOT_FOUND", "Note not found.");
          return Response.json({ data: note });
        }),
      DELETE: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = noteIdSchema.parse(params.id);
          if (!(await deleteNote(session.user.id, id)))
            throw new ApiError(404, "NOT_FOUND", "Note not found.");
          return new Response(null, { status: 204 });
        }),
    },
  },
});
