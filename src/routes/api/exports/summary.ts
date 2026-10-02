import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { buildSummaryExport } from "@/services/exports.service.server";
import { summaryExportSchema } from "@/validators/exports";

// Downloadable comparison summary: the conversation's cumulative totals and/or
// a mass test report, as Markdown or JSON. `testRun=latest` picks the newest
// finished run; with no finished run the file simply leaves that part out.
export const Route = createFileRoute("/api/exports/summary")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const input = summaryExportSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          const result = await buildSummaryExport(session.user.id, input);
          if (result.kind === "not_found")
            throw new ApiError(
              404,
              "NOT_FOUND",
              result.what === "conversation"
                ? "Conversation not found."
                : "Test run not found.",
            );
          return new Response(result.content, {
            headers: {
              "Content-Type": `${result.mimeType}; charset=utf-8`,
              "Content-Disposition": `attachment; filename="${result.fileName}"`,
            },
          });
        }),
    },
  },
});
