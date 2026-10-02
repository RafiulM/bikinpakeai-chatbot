import { createFileRoute } from "@tanstack/react-router";
import { readJson, withApiSession } from "@/lib/api.server";
import { createNote, listNotes } from "@/services/notes.service.server";
import { createNoteSchema, listNotesSchema } from "@/validators/notes";

export const Route = createFileRoute("/api/notes/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const query = listNotesSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json(await listNotes(session.user.id, query));
        }),
      POST: ({ request }) =>
        withApiSession(request, async (session) => {
          const input = createNoteSchema.parse(await readJson(request));
          const note = await createNote(session.user.id, input);
          return Response.json(
            { data: note },
            { status: 201, headers: { Location: `/api/notes/${note.id}` } },
          );
        }),
    },
  },
});
