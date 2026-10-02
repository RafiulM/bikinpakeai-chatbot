import { createFileRoute } from "@tanstack/react-router";
import { readJson, withApiSession } from "@/lib/api.server";
import {
  createConversation,
  listConversations,
} from "@/services/conversations.service.server";
import {
  createConversationSchema,
  listConversationsSchema,
} from "@/validators/conversations";

export const Route = createFileRoute("/api/conversations/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const query = listConversationsSchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json(await listConversations(session.user.id, query));
        }),
      POST: ({ request }) =>
        withApiSession(request, async (session) => {
          createConversationSchema.parse(await readJson(request));
          const conversation = await createConversation(session.user.id);
          return Response.json(
            { data: conversation },
            {
              status: 201,
              headers: { Location: `/api/conversations/${conversation.id}` },
            },
          );
        }),
    },
  },
});
