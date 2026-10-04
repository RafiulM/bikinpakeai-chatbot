import { Link } from "@tanstack/react-router";
import {
  Ellipsis,
  History,
  MessagesSquare,
  ScanSearch,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewId } from "@/lib/lab/types";

export interface ViewLink {
  id: ViewId;
  to: "/compare" | "/debug";
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

export const VIEW_LINKS: ViewLink[] = [
  {
    id: "compare",
    to: "/compare",
    label: "Chat",
    shortcut: "1",
    icon: MessagesSquare,
  },
  {
    id: "debug",
    to: "/debug",
    label: "Debug",
    shortcut: "2",
    icon: ScanSearch,
  },
];

const TOOL_LINKS = [
  { to: "/riwayat", label: "Riwayat Sesi", icon: History },
  { to: "/konfigurasi", label: "Konfigurasi Agent", icon: SlidersHorizontal },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

// The active view is filled dark and carries aria-current (set by Link), so it
// never relies on color alone.
const viewClass = [
  "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap text-foreground/70 transition-colors",
  "hover:bg-muted hover:text-foreground",
  "aria-[current=page]:bg-foreground aria-[current=page]:text-background",
].join(" ");

const toolClass = [
  "inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors",
  "hover:bg-muted hover:text-foreground",
  "aria-[current=page]:bg-muted aria-[current=page]:text-foreground",
].join(" ");

/**
 * Main views on the left, demo tools on the right: inline on wide screens,
 * behind one menu button on narrow ones.
 */
export function ViewNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="flex min-w-0 flex-1 items-center gap-2"
    >
      <ul className="flex items-center gap-1">
        {VIEW_LINKS.map((view) => (
          <li key={view.id}>
            <Link
              to={view.to}
              className={viewClass}
              aria-keyshortcuts={view.shortcut}
              title={`${view.label} (${view.shortcut})`}
            >
              <view.icon className="size-4 max-sm:hidden" aria-hidden="true" />
              {view.label}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="ml-auto flex items-center gap-0.5 max-md:hidden">
        {TOOL_LINKS.map((tool) => (
          <li key={tool.to}>
            <Link
              to={tool.to}
              className={toolClass}
              aria-label={tool.label}
              title={tool.label}
            >
              <tool.icon className="size-[18px]" aria-hidden="true" />
              <span aria-hidden="true" className="max-xl:hidden">
                {tool.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="ml-auto md:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Alat lain" className={toolClass}>
              <Ellipsis className="size-[18px]" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {TOOL_LINKS.map((tool) => (
              <DropdownMenuItem key={tool.to} asChild>
                <Link to={tool.to}>
                  <tool.icon aria-hidden="true" />
                  {tool.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
