// STARTER PLACEHOLDER. Replace this page with your app's first screen. The
// data-starter-placeholder attribute below lets `npm run doctor` remind you
// while it is still here; delete e2e/starter.spec.ts along with it.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Plus, ShieldCheck } from "lucide-react";
import { hasPermissionFn } from "@/lib/session";
import { siteConfig } from "@/config/site";
import { CopyPrompt } from "@/components/copy-prompt";
import { Button } from "@/components/ui/button";

const prompt =
  "Read AGENTS.md and use the build-feature skill. Replace the blank app page with [describe your first feature]. Keep authentication working, store any user data with Drizzle and PostgreSQL, and use Context7 to check library APIs.";

export const Route = createFileRoute("/_protected/app")({
  head: () => ({ meta: [{ title: `Your app | ${siteConfig.name}` }] }),
  // Hiding the link is presentation only. /admin and its API guard themselves.
  loader: () => hasPermissionFn({ data: { notes: ["read-any"] } }),
  component: AppPage,
});

function AppPage() {
  const { user } = Route.useRouteContext().session;
  const isAdmin = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <Check className="size-4" aria-hidden="true" /> You’re signed in
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Welcome, {user.name}.
      </h1>
      <p className="mt-3 text-lg leading-7 text-muted-foreground">
        This is your app. Let’s give it something to do.
      </p>
      <section
        className="mt-9 rounded-2xl border border-dashed bg-card px-6 py-10 sm:px-10"
        aria-labelledby="blank-canvas"
        data-starter-placeholder
      >
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl border bg-muted">
          <Plus className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 id="blank-canvas" className="text-xl font-semibold tracking-tight">
          Your first feature starts here
        </h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
          A reading list? A space for project ideas? Tell your AI editor what
          you need, and build from this blank canvas.
        </p>
        <blockquote className="my-6 border-l-2 border-primary/50 pl-4 text-sm leading-7 text-muted-foreground">
          {prompt}
        </blockquote>
        <CopyPrompt text={prompt} />
      </section>
      {isAdmin && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Your role can read every account’s notes.
          </p>
          <Button variant="outline" asChild size="sm">
            <Link to="/admin">
              <ShieldCheck aria-hidden="true" />
              Open admin
            </Link>
          </Button>
        </div>
      )}
      <p className="mt-6 break-all text-sm text-muted-foreground">
        Signed in as {user.email}
      </p>
    </div>
  );
}
