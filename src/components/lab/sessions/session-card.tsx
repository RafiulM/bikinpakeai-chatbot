import { Link } from "@tanstack/react-router";
import { AlertTriangle, MessagesSquare, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/lab/format";
import { CATEGORY_LABEL } from "@/lib/lab/scenarios";
import {
  LEVEL_LABEL,
  peakLevel,
  ranked,
  SIGNAL_LABEL,
} from "@/lib/lab/session-overview";
import {
  FRUSTRATION_LEVELS,
  JEV_SIGNALS,
  URGENCIES,
  type ConversationListItem,
  type JevTally,
} from "@/lib/lab/types";
import { DECISION_ORDER, DecisionTag } from "../debug/decision-tag";

export function SessionStatus({
  status,
}: {
  status: ConversationListItem["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        status === "active"
          ? "border-signal/40 bg-signal-soft text-signal-text"
          : "bg-muted text-muted-foreground",
      )}
    >
      {status === "active" ? "Aktif" : "Selesai"}
    </span>
  );
}

/**
 * Jev's reading of one session at a glance: its intents, the strongest
 * emotion and urgency it saw, the products, and any risk signal raised.
 */
function JevSummary({ jev }: { jev: JevTally }) {
  const intents = ranked(jev.intents);
  const emotion = peakLevel(FRUSTRATION_LEVELS, jev.emotions);
  const urgency = peakLevel(URGENCIES, jev.urgencies);
  const products = ranked(jev.products).map(([product]) => product);
  const signals = JEV_SIGNALS.filter((signal) => jev.signals[signal] > 0);
  const items = [
    intents.length > 0 && {
      label: "Intent",
      value: intents
        .map(([intent, count]) =>
          count > 1
            ? `${CATEGORY_LABEL[intent]} ×${count}`
            : CATEGORY_LABEL[intent],
        )
        .join(", "),
    },
    emotion && {
      label: "Emosi",
      value: `frustrasi ${LEVEL_LABEL[emotion].toLowerCase()}`,
    },
    urgency && { label: "Urgensi", value: LEVEL_LABEL[urgency].toLowerCase() },
    products.length > 0 && { label: "Produk", value: products.join(", ") },
  ].filter((item) => item !== false && item !== null);
  if (items.length === 0 && signals.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      {items.length > 0 && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
          {items.map((item) => (
            <div key={item.label} className="flex gap-1">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {signals.length > 0 && (
        <ul aria-label="Sinyal risiko" className="flex flex-wrap gap-1.5">
          {signals.map((signal) => (
            <li
              key={signal}
              className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/12 px-2 py-0.5 font-semibold text-warning-text"
            >
              <AlertTriangle className="size-3" aria-hidden="true" />
              {SIGNAL_LABEL[signal]}
              {jev.signals[signal] > 1 && (
                <span className="tabular-nums">×{jev.signals[signal]}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One saved conversation: what happened in it, and where to review it. */
export function SessionCard({
  session,
  current,
}: {
  session: ConversationListItem;
  /** True for the conversation the other views have open right now. */
  current: boolean;
}) {
  const empty = session.messageCount === 0;
  return (
    <li
      aria-current={current ? "true" : undefined}
      className={cn(
        "grid gap-3 rounded-[14px] border bg-card px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        "aria-[current=true]:border-foreground",
      )}
    >
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-sm font-semibold">{session.code}</span>
          <SessionStatus status={session.status} />
          {current && (
            <span className="inline-flex items-center rounded-full bg-foreground px-2 py-0.5 font-semibold text-background">
              Sedang dibuka
            </span>
          )}
          <span className="text-muted-foreground tabular-nums">
            mulai {formatClock(session.createdAt)}
            {session.lastMessageAt &&
              ` · pesan terakhir ${formatClock(session.lastMessageAt)}`}
          </span>
        </div>
        <h3 className="truncate text-[15px] font-medium" title={session.title}>
          {session.title}
        </h3>
        {empty ? (
          <p className="text-xs text-muted-foreground">Belum ada pesan.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="mr-1 tabular-nums">
              {session.messageCount} pesan
              {session.tickets > 0 && ` · ${session.tickets} tiket`}
            </span>
            {DECISION_ORDER.filter(
              (decision) => session.jev.decisions[decision],
            ).map((decision) => (
              <DecisionTag
                key={decision}
                decision={decision}
                count={session.jev.decisions[decision]}
              />
            ))}
            {session.failures > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-danger/35 bg-danger/8 px-2.5 py-0.5 font-semibold text-danger-text">
                <AlertTriangle className="size-3" aria-hidden="true" />
                {session.failures} gagal
              </span>
            )}
          </div>
        )}
        {!empty && <JevSummary jev={session.jev} />}
      </div>
      <div className="flex flex-wrap gap-2">
        {!empty && (
          <Button asChild size="sm">
            <Link to="/debug" search={(prev) => ({ ...prev, c: session.id })}>
              <ScanSearch aria-hidden="true" />
              Review Debug
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link to="/compare" search={(prev) => ({ ...prev, c: session.id })}>
            <MessagesSquare aria-hidden="true" />
            Buka Chat
          </Link>
        </Button>
      </div>
    </li>
  );
}
