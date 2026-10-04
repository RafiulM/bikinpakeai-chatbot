import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSession } from "@/lib/session.server";
import { getAgentConfig } from "@/services/agent-config.service.server";

// Server function for the Konfigurasi route loader: the agent's models,
// instructions, policy and knowledge base, rendered on the server so links to
// one document (#doc-<id>) land on it. Checks the session itself.
export const loadAgentConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getSession(getRequestHeaders() as unknown as Headers);
    if (!session) throw redirect({ to: "/sign-in" });
    return getAgentConfig(session.user.id);
  },
);
