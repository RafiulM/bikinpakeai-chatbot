import { useEffect, useId, useState, type ReactNode } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { labApi } from "@/lib/lab/api-client";
import { CATEGORY_LABEL } from "@/lib/lab/scenarios";
import {
  LEVEL_LABEL,
  percentOf,
  ranked,
  SIGNAL_LABEL,
} from "@/lib/lab/session-overview";
import {
  FRUSTRATION_LEVELS,
  JEV_SIGNALS,
  URGENCIES,
  type SessionOverview as Overview,
} from "@/lib/lab/types";
import { DECISION_LABEL, DECISION_ORDER } from "../debug/decision-tag";
import type { SessionStatusFilter } from "./use-session-list";

interface Row {
  key: string;
  label: string;
  count: number;
}

/**
 * One measure as a list of bars. Every bar is a share of the messages Jev
 * read, so bars compare across panels; the count and percent are written
 * at the tip, so the bar is never the only way to read the value.
 */
function BarPanel({
  title,
  rows,
  total,
  icon,
}: {
  title: string;
  rows: Row[];
  total: number;
  icon?: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid content-start gap-2.5 rounded-[14px] border bg-surface-subtle/60 p-4"
    >
      <h3
        id={id}
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada.</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((row) => {
            const percent = percentOf(row.count, total);
            return (
              <li
                key={row.key}
                title={`${row.label}: ${row.count} pesan · ${percent}%`}
                className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_4.75rem] items-center gap-2.5 text-sm"
              >
                <span className="truncate">{row.label}</span>
                <span
                  aria-hidden="true"
                  className="h-2 overflow-hidden rounded-[4px] bg-muted"
                >
                  <span
                    className="block h-full rounded-r-[4px] bg-foreground/80"
                    style={{
                      width: row.count > 0 ? `max(3px, ${percent}%)` : 0,
                    }}
                  />
                </span>
                <span className="text-right text-xs font-semibold tabular-nums">
                  {row.count}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {percent}%
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Ordered levels, most severe on top; empty levels are left out. */
function levelRows<K extends string>(
  order: readonly K[],
  counts: Partial<Record<K, number>>,
): Row[] {
  return [...order]
    .reverse()
    .filter((key) => counts[key])
    .map((key) => ({
      key,
      label: LEVEL_LABEL[key] ?? key,
      count: counts[key] ?? 0,
    }));
}

/**
 * How Jev classified every message in the sessions matching the list's
 * search and status filter: intent, emotion, urgency, product, decision, and
 * risk signals.
 */
export function SessionOverview({
  q,
  status,
}: {
  q: string;
  status: SessionStatusFilter;
}) {
  const titleId = useId();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    labApi
      .sessionOverview({ q, status })
      .then((loaded) => {
        if (!active) return;
        setOverview(loaded);
        setError(null);
      })
      .catch(() => {
        if (active) setError("Ringkasan Jev gagal dimuat.");
      });
    return () => {
      active = false;
    };
  }, [q, status, attempt]);

  const filtered = q !== "" || status !== "all";
  const total = overview?.analyzed ?? 0;

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={!overview && !error}
      className="grid gap-4 rounded-[20px] border bg-card p-5 max-sm:p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-[17px] font-semibold"
        >
          <Sparkles className="size-4 text-signal-text" aria-hidden="true" />
          Ringkasan Jev
        </h2>
        {overview && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {overview.sessions} sesi{filtered && " yang cocok"} ·{" "}
            {overview.analyzed} pesan dibaca Jev
          </p>
        )}
      </div>

      {error ? (
        <p
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          {error}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAttempt((count) => count + 1)}
          >
            Coba lagi
          </Button>
        </p>
      ) : !overview ? (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat ringkasan…
        </p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filtered
            ? "Belum ada pesan yang dibaca Jev di sesi yang cocok."
            : "Belum ada pesan yang dibaca Jev. Ringkasan muncul setelah chat pertama."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <BarPanel
            title="Intent · jenis masalah"
            total={total}
            rows={ranked(overview.intents).map(([key, count]) => ({
              key,
              label: CATEGORY_LABEL[key],
              count,
            }))}
          />
          <BarPanel
            title="Emosi · tingkat frustrasi"
            total={total}
            rows={levelRows(FRUSTRATION_LEVELS, overview.emotions)}
          />
          <BarPanel
            title="Urgensi"
            total={total}
            rows={levelRows(URGENCIES, overview.urgencies)}
          />
          <BarPanel
            title="Produk"
            total={total}
            rows={ranked(overview.products).map(([key, count]) => ({
              key,
              label: key,
              count,
            }))}
          />
          <BarPanel
            title="Keputusan Jev"
            total={total}
            rows={DECISION_ORDER.filter(
              (decision) => overview.decisions[decision],
            ).map((decision) => ({
              key: decision,
              label: DECISION_LABEL[decision],
              count: overview.decisions[decision] ?? 0,
            }))}
          />
          <BarPanel
            title="Sinyal risiko"
            icon={<AlertTriangle className="size-3.5" aria-hidden="true" />}
            total={total}
            rows={JEV_SIGNALS.map((signal) => ({
              key: signal,
              label: SIGNAL_LABEL[signal],
              count: overview.signals[signal],
            }))}
          />
        </div>
      )}
    </section>
  );
}
