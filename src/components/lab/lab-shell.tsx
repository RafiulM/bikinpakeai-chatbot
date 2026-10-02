import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Columns2,
  Headset,
  MessageCircle,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import type { ViewId } from "@/lib/lab/types";

export interface ViewLink {
  id: ViewId;
  to: "/customer" | "/debug" | "/compare" | "/agent";
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

export const VIEW_LINKS: ViewLink[] = [
  {
    id: "customer",
    to: "/customer",
    label: "Customer",
    shortcut: "1",
    icon: MessageCircle,
  },
  {
    id: "debug",
    to: "/debug",
    label: "Debug",
    shortcut: "2",
    icon: ScanSearch,
  },
  {
    id: "compare",
    to: "/compare",
    label: "Compare",
    shortcut: "3",
    icon: Columns2,
  },
  { id: "agent", to: "/agent", label: "Agent", shortcut: "4", icon: Headset },
];

const linkClass =
  "flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[15px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_0_0_1px_var(--border)] max-lg:whitespace-nowrap [&[aria-current=page]_svg]:text-signal-text";

/**
 * Signed-in frame for every Support Lab view: a navigation rail on wide
 * screens, a scrollable top bar on narrow ones.
 */
export function LabShell({
  session,
  userEmail,
  children,
}: {
  /** Summary of the conversation shared by all views. */
  session: ReactNode;
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="z-10 flex gap-6 border-b bg-canvas-warm px-4 py-2 max-lg:sticky max-lg:top-0 max-lg:items-center max-lg:overflow-x-auto lg:sticky lg:top-0 lg:h-dvh lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-3 lg:py-5">
        <Link
          to="/customer"
          className="grid shrink-0 gap-0.5 rounded-[10px] px-3 py-1 max-lg:px-0"
        >
          <span className="text-[17px] leading-tight font-semibold tracking-tight">
            Bikinpakeai
          </span>
          <span className="text-xs text-muted-foreground max-lg:hidden">
            Support Lab · Jev vs tanpa Jev
          </span>
        </Link>
        <nav aria-label="Navigasi utama" className="grid gap-5 max-lg:flex">
          <div className="grid gap-1 max-lg:flex">
            <p
              id="lab-nav-views"
              className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase max-lg:sr-only"
            >
              Tampilan
            </p>
            <ul
              aria-labelledby="lab-nav-views"
              className="grid gap-0.5 max-lg:flex"
            >
              {VIEW_LINKS.map((view) => (
                <li key={view.id}>
                  <Link to={view.to} className={linkClass}>
                    <view.icon
                      className="size-[18px] shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {view.label}
                    <kbd
                      aria-hidden="true"
                      className="ml-auto min-w-[22px] rounded-md border bg-card px-1.5 text-center font-mono text-xs leading-[18px] text-muted-foreground max-lg:hidden"
                    >
                      {view.shortcut}
                    </kbd>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="ml-auto shrink-0 lg:hidden">
          <SignOutButton />
        </div>
        <div className="mt-auto grid gap-3 max-lg:hidden">
          {session}
          <div className="grid gap-2 px-1">
            <p
              className="truncate text-xs text-muted-foreground"
              title={userEmail}
            >
              {userEmail}
            </p>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main
        id="main-content"
        className="min-w-0 px-8 pt-6 pb-10 max-lg:px-4 max-lg:pt-4"
      >
        {children}
      </main>
    </div>
  );
}

export function SessionCard({
  code,
  title,
  messageCount,
}: {
  code: string;
  title: string;
  messageCount: number;
}) {
  return (
    <section
      aria-label="Percakapan aktif"
      className="grid gap-1 rounded-2xl border bg-card px-4 py-3 text-[13px] leading-snug"
    >
      <p className="text-xs font-semibold text-muted-foreground">
        Percakapan aktif
      </p>
      <p className="font-semibold [overflow-wrap:anywhere]">
        {code} · {title}
      </p>
      <p className="text-muted-foreground">
        {messageCount} pesan · tetap utuh di semua tampilan
      </p>
    </section>
  );
}
