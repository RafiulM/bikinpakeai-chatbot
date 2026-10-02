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
import { labSearchSchema } from "@/lib/lab/search";

// Pathless layout for signed-in screens. The check runs on the server during
// SSR and again on client navigation. It protects pages only: API routes and
// server functions must verify the session themselves.
export const Route = createFileRoute("/_protected")({
  // ?c=<conversationId> survives every switch between views.
  validateSearch: labSearchSchema,
  search: { middlewares: [retainSearchParams(["c"])] },
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: "/sign-in" });
    return { session: context.session };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { user } = Route.useRouteContext().session;
  return (
    <LabConversationProvider>
      <LabShell userEmail={user.email} session={<ActiveSessionCard />}>
        <Outlet />
      </LabShell>
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
