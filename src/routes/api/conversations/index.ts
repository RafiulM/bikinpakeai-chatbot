import { createFileRoute } from "@tanstack/react-router";
import { readJson, withApiSession } from "@/lib/api.server";
import { createConversation } from "@/services/conversations.service.server";
import { createConversationSchema } from "@/validators/conversations";

export const Route = createFileRoute("/api/conversations/")({
  server: {
    handlers: {
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
