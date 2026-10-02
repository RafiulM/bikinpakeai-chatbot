import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

// Better Auth owns everything under /api/auth: signup, signin, session, signout.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
