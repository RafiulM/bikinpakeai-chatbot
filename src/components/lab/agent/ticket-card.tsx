import { MessageSquareReply } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/lib/lab/types";
import { formatScore } from "@/lib/lab/format";
import { FrustrationTag, PriorityTag, StatusTag } from "./ticket-tags";

const ageFormat = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

export function relativeAge(iso: string, now: number) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 60) return ageFormat.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return ageFormat.format(hours, "hour");
  return ageFormat.format(Math.round(hours / 24), "day");
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      {label} {formatScore(value)}
      <span
        aria-hidden="true"
        className="h-1 w-10 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={cn(
            "block h-full rounded-full",
            value >= 0.75 ? "bg-danger" : "bg-foreground",
          )}
          style={{ width: `${value * 100}%` }}
        />
      </span>
    </span>
  );
}

/** One ticket in the queue with enough context to triage it at a glance. */
export function TicketCard({
  ticket,
  selected,
  now,
  onSelect,
}: {
  ticket: SupportTicket;
  selected: boolean;
  now: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "grid w-full gap-2 rounded-[10px] border bg-card px-4 py-3 text-left transition-colors hover:border-border-strong",
        "aria-[current=true]:border-foreground aria-[current=true]:bg-canvas-warm aria-[current=true]:shadow-[inset_3px_0_0_var(--signal)]",
      )}
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold">{ticket.code}</span>
        <PriorityTag priority={ticket.priority} />
        <FrustrationTag score={ticket.frustrationScore} />
        {ticket.status !== "open" && (
          <StatusTag status={ticket.status} claimedBy={ticket.claimedBy} />
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {relativeAge(ticket.createdAt, now)}
        </span>
      </span>
      <span className="line-clamp-2 text-sm leading-normal font-medium">
        {ticket.summary}
      </span>
      <span className="text-xs text-muted-foreground">
        {ticket.conversationCode} · {ticket.product} · {ticket.issueLabel}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/80">
        <Meter label="Risiko churn" value={ticket.churnRisk} />
        {ticket.replies.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
            <MessageSquareReply className="size-3.5" aria-hidden="true" />
            {ticket.replies.length} balasan
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        Alasan eskalasi: {ticket.escalationReason}
      </span>
    </button>
  );
}
