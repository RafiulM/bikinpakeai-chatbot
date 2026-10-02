import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import type { TestRunState } from "@/lib/lab/types";
import {
  getTestRunState,
  subscribeTestRun,
} from "@/services/test-runs.service.server";
import { testRunIdSchema } from "@/validators/test-sets";

const HEARTBEAT_MS = 20_000;

// Server-Sent Events for one test run: a "progress" event with the full run
// state on connect and after every finished message. The stream ends after
// the run is done, failed, or cancelled.
export const Route = createFileRoute("/api/test-runs/$id/events")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = testRunIdSchema.safeParse(params.id);
          const run =
            id.success && (await getTestRunState(session.user.id, id.data));
          if (!id.success || !run)
            throw new ApiError(404, "NOT_FOUND", "Test run not found.");

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
              const send = (state: TestRunState) => {
                write(
                  `id: ${state.processed}\nevent: progress\ndata: ${JSON.stringify(state)}\n\n`,
                );
                if (state.status !== "running") cleanup();
              };
              const unsubscribe = subscribeTestRun(id.data, send);
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
              write("retry: 3000\n\n");
              // Read again after subscribing so a run that finishes in
              // between still ends the stream.
              void getTestRunState(session.user.id, id.data).then(
                (state) => state && send(state),
              );
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
