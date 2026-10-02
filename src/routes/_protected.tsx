import {
  createFileRoute,
  Outlet,
  redirect,
  retainSearchParams,
} from "@tanstack/react-router";
import {
  LabConversationProvider,
  useActiveConversationSummary,
} from "@/components/lab/conversation-store";
import { LabShell, SessionCard } from "@/components/lab/lab-shell";
import { TicketProvider } from "@/components/lab/ticket-store";
import { loadConversationFn } from "@/lib/lab/conversation.functions";
import { labSearchSchema } from "@/lib/lab/search";

// Pathless layout for signed-in screens. The check runs on the server during
// SSR and again on client navigation. It protects pages only: API routes and
// server functions must verify the session themselves.
export const Route = createFileRoute("/_protected")({
  // ?c=<conversationId> and ?rekam=1 survive every switch between views.
  validateSearch: labSearchSchema,
  search: { middlewares: [retainSearchParams(["c", "rekam"])] },
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: "/sign-in" });
    return { session: context.session };
  },
  // The conversation to open, rendered on the server. Later switches are
  // handled by the conversation store, so the loader runs only once.
  loader: ({ location }) => {
    const c = (location.search as { c?: string }).c;
    return loadConversationFn({ data: { id: c } });
  },
  shouldReload: false,
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { user } = Route.useRouteContext().session;
  const { conversation } = Route.useLoaderData();
  return (
    <LabConversationProvider initial={conversation}>
      <TicketProvider>
        <LabShell userEmail={user.email} session={<ActiveSessionCard />}>
          <Outlet />
        </LabShell>
      </TicketProvider>
    </LabConversationProvider>
  );
}

function ActiveSessionCard() {
  const summary = useActiveConversationSummary();
  return (
    <SessionCard
      code={summary.code}
      title={summary.title}
      messageCount={summary.messageCount}
      conversationId={summary.id}
    />
  );
}
