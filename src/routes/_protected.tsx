import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";

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
  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <Brand />
          <SignOutButton />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16"
      >
        <Outlet />
      </main>
    </>
  );
}
