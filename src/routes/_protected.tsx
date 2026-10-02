import {
  createFileRoute,
  Outlet,
  redirect,
  retainSearchParams,
} from "@tanstack/react-router";
import { LabShell, SessionCard } from "@/components/lab/lab-shell";
import { mockConversation } from "@/lib/lab/mock-data";
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
    <LabShell
      userEmail={user.email}
      session={
        <SessionCard
          code={mockConversation.code}
          title={mockConversation.title}
          messageCount={mockConversation.turns.length}
          conversationId={mockConversation.id}
        />
      }
    >
      <Outlet />
    </LabShell>
  );
}
