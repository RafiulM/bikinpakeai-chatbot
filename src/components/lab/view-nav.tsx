import { useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Columns2,
  Headset,
  MessageCircle,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
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

// The active view gets a filled surface, a bold label, an orange marker and
// aria-current (set by Link), so it never relies on color alone.
const linkClass = [
  "relative flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[15px] font-medium text-foreground/75 transition-colors",
  "hover:bg-muted hover:text-foreground",
  "aria-[current=page]:bg-card aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_0_0_1px_var(--border)]",
  "aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-2 aria-[current=page]:before:left-0 aria-[current=page]:before:w-[3px] aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-signal",
  "max-lg:whitespace-nowrap max-lg:aria-[current=page]:before:inset-x-3 max-lg:aria-[current=page]:before:top-auto max-lg:aria-[current=page]:before:bottom-0 max-lg:aria-[current=page]:before:h-[3px] max-lg:aria-[current=page]:before:w-auto",
  "[&[aria-current=page]_svg]:text-signal-text",
].join(" ");

/** Buttons for the four views of the same conversation. */
export function ViewNav() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const listRef = useRef<HTMLUListElement>(null);

  // On the narrow top bar, keep the active view visible after navigating.
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Navigasi utama" className="grid gap-5 max-lg:flex">
      <div className="grid gap-1 max-lg:flex">
        <p
          id="lab-nav-views"
          className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase max-lg:sr-only"
        >
          Tampilan
        </p>
        <ul
          ref={listRef}
          aria-labelledby="lab-nav-views"
          className="grid gap-0.5 max-lg:flex"
        >
          {VIEW_LINKS.map((view) => (
            <li key={view.id}>
              <Link
                to={view.to}
                className={linkClass}
                aria-keyshortcuts={view.shortcut}
                title={`${view.label} (tekan ${view.shortcut})`}
              >
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
  );
}
