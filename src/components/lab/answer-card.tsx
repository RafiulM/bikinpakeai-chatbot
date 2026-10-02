import type { ReactNode } from "react";
import { Check, Headset, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BotResponse } from "@/lib/lab/types";
import { formatSeconds, formatUsd } from "@/lib/lab/format";

const MODE_LABEL = {
  with_jev: "Dengan Jev",
  without_jev: "Tanpa Jev",
} as const;

/** One answer in a side-by-side comparison, with its own time, cost and verdict. */
export function AnswerCard({
  response,
  badge,
  emphasized = false,
  children,
  extra,
}: {
  response: BotResponse | null;
  /** Optional marker next to the title, e.g. the "better answer" badge. */
  badge?: ReactNode;
  emphasized?: boolean;
  /** Replaces the plain answer text, e.g. with highlighted phrases. */
  children?: ReactNode;
  /** Extra content under the answer, e.g. the list of problems. */
  extra?: ReactNode;
}) {
  if (!response) {
    return (
      <section className="grid content-start gap-3 rounded-2xl border border-dashed bg-surface-subtle p-4 text-sm text-muted-foreground">
        Jawaban belum tersedia.
      </section>
    );
  }
  const title = MODE_LABEL[response.mode];
  return (
    <section
      aria-label={`Jawaban ${title.toLowerCase()}`}
      className={cn(
        "grid grid-rows-[auto_1fr_auto] gap-3 rounded-2xl border p-4",
        emphasized ? "border-foreground bg-card" : "bg-surface-subtle",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {badge}
      </div>
      <div className="grid content-start gap-3">
        <p className="text-[15px] leading-relaxed [overflow-wrap:anywhere]">
          {children ?? response.content}
        </p>
        {extra}
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-3">
        <Metric label="Waktu">{formatSeconds(response.latencyMs)}</Metric>
        <Metric label="Biaya">{formatUsd(response.costUsd)}</Metric>
        <Metric label="Hasil">
          <VerdictLabel response={response} />
        </Metric>
      </dl>
    </section>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="inline-flex items-center gap-1 text-[15px] font-medium tabular-nums">
        {children}
      </dd>
    </div>
  );
}

export function VerdictLabel({ response }: { response: BotResponse }) {
  const { verdict, verdictLabel } = response.review;
  if (verdict === "wrong") {
    return (
      <span className="inline-flex items-center gap-1 text-danger-text">
        <X className="size-4" aria-hidden="true" />
        {verdictLabel}
      </span>
    );
  }
  const Icon = verdict === "escalated" ? Headset : Check;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-4 text-positive" aria-hidden="true" />
      {verdictLabel}
    </span>
  );
}
