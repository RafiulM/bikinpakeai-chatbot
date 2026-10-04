import {
  createFileRoute,
  Outlet,
  redirect,
  retainSearchParams,
} from "@tanstack/react-router";
import { LabConversationProvider } from "@/components/lab/conversation-store";
import { DisplaySettingsProvider } from "@/components/lab/display-settings";
import { LabShell } from "@/components/lab/lab-shell";
import { loadConversationFn } from "@/lib/lab/conversation.functions";
import { labSearchSchema } from "@/lib/lab/search";
import { loadDisplaySettingsFn } from "@/lib/lab/settings.functions";

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
  // The conversation to open and the display settings, rendered on the
  // server. Later changes are handled by the conversation store and the
  // display settings provider, so the loader runs only once.
  loader: async ({ location }) => {
    const c = (location.search as { c?: string }).c;
    const [result, display] = await Promise.all([
      loadConversationFn({ data: { id: c } }),
      loadDisplaySettingsFn(),
    ]);
    // Put the opened conversation in the address before rendering, so the
    // server HTML already has the ?c= every link carries; adding it later in
    // the browser made links render differently during hydration.
    const id = result.conversation?.id;
    if (id && id !== c) {
      const search = new URLSearchParams(location.searchStr);
      search.set("c", id);
      throw redirect({
        href: `${location.pathname}?${search}`,
        replace: true,
      });
    }
    return { ...result, display };
  },
  shouldReload: false,
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { user } = Route.useRouteContext().session;
  const { conversation, display } = Route.useLoaderData();
  return (
    <DisplaySettingsProvider initial={display}>
      <LabConversationProvider initial={conversation}>
        <LabShell userEmail={user.email}>
          <Outlet />
        </LabShell>
      </LabConversationProvider>
    </DisplaySettingsProvider>
  );
}
