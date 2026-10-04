import { createFileRoute } from "@tanstack/react-router";
import { databaseReachable } from "@/services/health.service.server";

// Public readiness probe for load balancers and container platforms: 200 when
// the app can reach PostgreSQL, 503 otherwise. It never reports error details.
// The Dockerfile HEALTHCHECK stays on a static asset (liveness), so a database
// outage does not restart healthy app containers.
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const database = await databaseReachable();
        return Response.json(
          { status: database ? "ok" : "unavailable", database },
          {
            status: database ? 200 : 503,
            headers: { "Cache-Control": "no-store" },
          },
        );
      },
    },
  },
});
