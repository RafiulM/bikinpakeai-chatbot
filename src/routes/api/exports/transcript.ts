import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { buildTranscriptExport } from "@/services/exports.service.server";
import { transcriptExportSchema } from "@/validators/exports";

// Labelled transcript of one conversation: every customer message with Jev's
// labels, decision and both answers, as plain text or Markdown. Sensitive
// data stays masked. `download=1` saves it as a file.
export const Route = createFileRoute("/api/exports/transcript")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const input = transcriptExportSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          const file = await buildTranscriptExport(session.user.id, input);
          if (!file)
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
          return new Response(file.content, {
            headers: {
              "Content-Type": `${file.mimeType}; charset=utf-8`,
              "Content-Disposition": `${input.download ? "attachment" : "inline"}; filename="${file.fileName}"`,
            },
          });
        }),
    },
  },
});
