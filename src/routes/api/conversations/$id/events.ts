import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { subscribeLabEvents } from "@/lib/lab/events.server";
import { getConversationSummary } from "@/services/comparison.service.server";
import { conversationIdSchema } from "@/validators/conversations";

const HEARTBEAT_MS = 20_000;

// Server-Sent Events: "ready" with the current totals on connect, then a
// "comparison" event whenever both answers to a message are in.
export const Route = createFileRoute("/api/conversations/$id/events")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = conversationIdSchema.safeParse(params.id);
          const summary =
            id.success &&
            (await getConversationSummary(session.user.id, id.data));
          if (!id.success || !summary)
            throw new ApiError(404, "NOT_FOUND", "Conversation not found.");

          const encoder = new TextEncoder();
          let cleanup = () => {};
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const write = (chunk: string) => {
                try {
                  controller.enqueue(encoder.encode(chunk));
                } catch {
                  cleanup();
                }
              };
              const send = (event: string, data: unknown) =>
                write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

              send("ready", summary);
              const unsubscribe = subscribeLabEvents(id.data, (event) =>
                send(event.type, event),
              );
              const heartbeat = setInterval(
                () => write(": ping\n\n"),
                HEARTBEAT_MS,
              );
              cleanup = () => {
                clearInterval(heartbeat);
                unsubscribe();
                try {
                  controller.close();
                } catch {
                  // Already closed by the client.
                }
              };
              request.signal.addEventListener("abort", () => cleanup(), {
                once: true,
              });
            },
            cancel() {
              cleanup();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
        }),
    },
  },
});
