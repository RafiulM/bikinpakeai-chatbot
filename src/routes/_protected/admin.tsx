import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { hasPermissionFn } from "@/lib/session";
import { listAnyNotes } from "@/services/notes.service.server";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";

// Server function: the body never reaches the browser bundle. It is only
// called from this route's loader, after beforeLoad has checked the role.
const listAnyNotesFn = createServerFn({ method: "GET" }).handler(() =>
  listAnyNotes({ limit: 50, offset: 0 }),
);

export const Route = createFileRoute("/_protected/admin")({
  head: () => ({ meta: [{ title: `Admin | ${siteConfig.name}` }] }),
  // Without notes:read-any this renders not-found, so the route stays invisible
  // to accounts that cannot use it. The layout's session check is not enough.
  beforeLoad: async () => {
    if (!(await hasPermissionFn({ data: { notes: ["read-any"] } })))
      throw notFound();
  },
  loader: () => listAnyNotesFn(),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext().session;
  const { data: notes, meta } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <ShieldCheck className="size-4" aria-hidden="true" /> Admin access
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Every account’s notes
      </h1>
      <p className="mt-3 text-lg leading-7 text-muted-foreground">
        {user.name}, your role grants <code>notes: read-any</code>. Regular
        accounts only ever see their own rows.
      </p>

      {notes.length === 0 ? (
        <p className="mt-9 rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-muted-foreground">
          No notes yet. Create one through the Notes API and it will show up
          here, whoever owns it.
        </p>
      ) : (
        <ul className="mt-9 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border bg-card px-5 py-4">
              <p className="font-medium">{note.title}</p>
              {note.content && (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {note.content}
                </p>
              )}
              <p className="mt-2 break-all text-xs text-muted-foreground">
                {note.ownerName} · {note.ownerEmail}
              </p>
            </li>
          ))}
        </ul>
      )}

      {meta.hasMore && (
        <p className="mt-4 text-sm text-muted-foreground">
          Showing the first {meta.limit}. Page with{" "}
          <code>?limit=&amp;offset=</code> on <code>/api/admin/notes</code>.
        </p>
      )}

      <div className="mt-8">
        <Button variant="ghost" asChild size="sm">
          <Link to="/app">
            <ArrowLeft aria-hidden="true" />
            Back to your app
          </Link>
        </Button>
      </div>
    </div>
  );
}
