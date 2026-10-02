import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/lib/lab/types";
import { formatScore } from "@/lib/lab/format";
import { PriorityTag, StatusTag } from "./ticket-tags";

const ageFormat = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

function age(iso: string, now: number) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 60) return ageFormat.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return ageFormat.format(hours, "hour");
  return ageFormat.format(Math.round(hours / 24), "day");
}

/** The queue: one row per escalated ticket. */
export function TicketList({
  tickets,
  selectedId,
  onSelect,
  now,
}: {
  tickets: SupportTicket[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  /** Reference time for "x minutes ago", fixed per render for SSR safety. */
  now: number;
}) {
  return (
    <ul className="grid gap-2">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <button
            type="button"
            aria-current={ticket.id === selectedId ? "true" : undefined}
            onClick={() => onSelect(ticket.id)}
            className={cn(
              "grid w-full gap-2 rounded-[10px] border bg-card px-4 py-3 text-left transition-colors hover:border-border-strong",
              "aria-[current=true]:border-foreground aria-[current=true]:bg-canvas-warm aria-[current=true]:shadow-[inset_3px_0_0_var(--signal)]",
            )}
          >
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold">{ticket.code}</span>
              <PriorityTag priority={ticket.priority} />
              {ticket.status !== "open" && <StatusTag status={ticket.status} />}
              <span className="ml-auto text-xs text-muted-foreground">
                {age(ticket.createdAt, now)}
              </span>
            </span>
            <span className="line-clamp-2 text-sm leading-normal">
              {ticket.summary}
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {ticket.product} · {ticket.issueLabel}
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 tabular-nums">
                Frustrasi {formatScore(ticket.frustrationScore)}
                <span
                  aria-hidden="true"
                  className="h-1 w-12 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full bg-foreground"
                    style={{ width: `${ticket.frustrationScore * 100}%` }}
                  />
                </span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
