import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { frustrationLevel } from "@/lib/lab/tickets";
import { formatScore } from "@/lib/lab/format";
import type { TicketPriority, TicketStatus } from "@/lib/lab/types";

const PRIORITY: Record<TicketPriority, { label: string; tone: string }> = {
  urgent: {
    label: "Mendesak",
    tone: "border-danger/40 bg-danger/12 text-danger-text",
  },
  high: {
    label: "Tinggi",
    tone: "border-warning/45 bg-warning/14 text-warning-text",
  },
  medium: { label: "Sedang", tone: "bg-muted text-foreground/80" },
  low: { label: "Rendah", tone: "bg-muted text-foreground/80" },
};

const STATUS: Record<TicketStatus, string> = {
  open: "Terbuka",
  claimed: "Diklaim",
  closed: "Ditutup",
};

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

export function PriorityTag({ priority }: { priority: TicketPriority }) {
  const { label, tone } = PRIORITY[priority];
  return (
    <span className={cn(base, tone)}>
      <span className="sr-only">Prioritas </span>
      {label}
    </span>
  );
}

export function StatusTag({
  status,
  claimedBy,
}: {
  status: TicketStatus;
  claimedBy?: string | null;
}) {
  return (
    <span
      className={cn(
        base,
        status === "closed"
          ? "border-positive/30 bg-positive/10 text-positive-text"
          : "bg-muted text-foreground/80",
      )}
    >
      {STATUS[status]}
      {status === "claimed" && claimedBy ? ` · ${claimedBy}` : ""}
    </span>
  );
}

export const STATUS_LABEL = STATUS;

const FRUSTRATION_TONE = {
  tinggi: "border-danger/40 bg-danger/12 text-danger-text",
  sedang: "border-warning/45 bg-warning/14 text-warning-text",
  rendah: "bg-muted text-foreground/80",
} as const;

/** Frustration as words plus the score, so it reads without color. */
export function FrustrationTag({ score }: { score: number }) {
  const level = frustrationLevel(score);
  return (
    <span className={cn(base, "gap-1 tabular-nums", FRUSTRATION_TONE[level])}>
      {level === "tinggi" && <Flame className="size-3" aria-hidden="true" />}
      Frustrasi {level} · {formatScore(score)}
    </span>
  );
}
