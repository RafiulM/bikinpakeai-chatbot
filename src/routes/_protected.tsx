import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LabShell, SessionCard } from "@/components/lab/lab-shell";
import { mockConversation } from "@/lib/lab/mock-data";

// Pathless layout for signed-in screens. The check runs on the server during
// SSR and again on client navigation. It protects pages only: API routes and
// server functions must verify the session themselves.
export const Route = createFileRoute("/_protected")({
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
        />
      }
    >
      <Outlet />
    </LabShell>
  );
}
