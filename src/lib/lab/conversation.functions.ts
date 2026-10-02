import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSession } from "@/lib/session.server";
import { resolveConversation } from "@/services/conversations.service.server";

// Server function for route loaders: opens the conversation named by ?c (or
// the newest active one) during server rendering, so a shared link shows the
// right conversation immediately in any view. Checks the session itself.
export const loadConversationFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid().optional().catch(undefined) }))
  .handler(async ({ data }) => {
    const session = await getSession(getRequestHeaders() as unknown as Headers);
    if (!session) return { conversation: null, requestedFound: false };
    return resolveConversation(session.user.id, data.id);
  });
