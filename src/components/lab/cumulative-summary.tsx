import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ConversationTurn } from "@/lib/lab/types";
import {
  conversationHeadline,
  ratioText,
  summarize,
  type ModeTotals,
} from "@/lib/lab/compare";
import { formatSeconds, formatUsd } from "@/lib/lab/format";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

/** Cumulative score for the whole conversation, as a thesis plus a scoreboard. */
export function CumulativeSummary({
  turns,
  code,
}: {
  turns: ConversationTurn[];
  code: string;
}) {
  const summary = summarize(turns);
  const { withJev, withoutJev, compared } = summary;

  if (compared === 0) {
    return (
      <section
        aria-label="Total kumulatif"
        className="rounded-[20px] border bg-card p-6 text-muted-foreground"
      >
        Total kumulatif muncul setelah pesan pertama dijawab dua jalur.
      </section>
    );
  }

  const speed = ratioText(withJev.latencyMs, withoutJev.latencyMs, "speed");
  const cost = ratioText(withJev.costUsd, withoutJev.costUsd, "cost");
  const jevIncidents = withJev.security;
  const support = [
    speed,
    cost,
    jevIncidents === 0 ? "tanpa insiden keamanan" : null,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="cumulative-title"
      className="grid gap-8 rounded-[20px] border bg-card px-8 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] max-sm:px-4"
    >
      <div className="grid content-start gap-3">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Total kumulatif · percakapan {code} · {compared} pesan
        </p>
        <h2
          id="cumulative-title"
          className="font-serif text-[clamp(30px,3vw,40px)] leading-[1.1] font-normal tracking-[-1.2px]"
        >
          {conversationHeadline(summary)}
        </h2>
        {support.length > 0 && (
          <p className="text-[19px] leading-snug text-foreground/85">
            Untuk pesan dan knowledge base yang sama: {support.join(", ")}.
          </p>
        )}
        <RunningScore running={summary.running} />
      </div>
      <table className="w-full border-collapse text-[15px] tabular-nums">
        <caption className="sr-only">
          Total kumulatif dengan Jev dan tanpa Jev
        </caption>
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <td className="pb-3" />
            <th
              scope="col"
              className="pb-3 text-left font-semibold text-foreground"
            >
              Dengan Jev
            </th>
            <th scope="col" className="pb-3 text-left font-semibold">
              Tanpa Jev
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
          <ScoreRow label="Ketepatan">
            <Accuracy totals={withJev} strong />
            <Accuracy totals={withoutJev} />
          </ScoreRow>
          <ScoreRow label="Total waktu">
            <Big>{formatSeconds(withJev.latencyMs)}</Big>
            <Big>{formatSeconds(withoutJev.latencyMs)}</Big>
          </ScoreRow>
          <ScoreRow label="Total biaya">
            <Big>{formatUsd(withJev.costUsd)}</Big>
            <Big>{formatUsd(withoutJev.costUsd)}</Big>
          </ScoreRow>
          <ScoreRow label="Insiden keamanan">
            <Big bad={withJev.security > 0}>{withJev.security}</Big>
            <Big bad={withoutJev.security > 0}>{withoutJev.security}</Big>
          </ScoreRow>
          <ScoreRow label="Di luar kebijakan">
            <Big bad={withJev.policy > 0}>{withJev.policy}</Big>
            <Big bad={withoutJev.policy > 0}>{withoutJev.policy}</Big>
          </ScoreRow>
        </tbody>
      </table>
    </section>
  );
}

function ScoreRow({
  label,
  children,
}: {
  label: string;
  children: [ReactNode, ReactNode];
}) {
  return (
    <tr>
      <th
        scope="row"
        className="w-[34%] py-3 text-left font-medium text-muted-foreground"
      >
        {label}
      </th>
      <td className="w-[33%] py-3 pr-4">{children[0]}</td>
      <td className="w-[33%] py-3 pr-4">{children[1]}</td>
    </tr>
  );
}

function Big({ children, bad }: { children: ReactNode; bad?: boolean }) {
  return (
    <span
      className={cn(
        "text-[22px] leading-tight font-medium tracking-[-0.5px] whitespace-nowrap max-sm:text-lg",
        bad && "text-danger-text",
      )}
    >
      {children}
    </span>
  );
}

function Accuracy({
  totals,
  strong,
}: {
  totals: ModeTotals;
  strong?: boolean;
}) {
  const ratio = totals.answered ? totals.correct / totals.answered : 0;
  return (
    <>
      <Big>
        {totals.correct}/{totals.answered}
      </Big>{" "}
      · {percent(ratio)}
      <span
        aria-hidden="true"
        className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={cn(
            "block h-full rounded-full",
            strong ? "bg-foreground" : "bg-muted-foreground/60",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </>
  );
}

function RunningScore({
  running,
}: {
  running: { withJev: number; withoutJev: number }[];
}) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm tabular-nums">
        <caption className="sr-only">
          Skor ketepatan berjalan setelah tiap pesan
        </caption>
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th scope="col" className="py-1.5 text-left font-semibold">
              Skor berjalan
            </th>
            {running.map((_, index) => (
              <th
                key={index}
                scope="col"
                className="py-1.5 text-right font-semibold"
              >
                P{index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
          {(["withJev", "withoutJev"] as const).map((mode) => (
            <tr key={mode}>
              <th scope="row" className="py-1.5 text-left font-medium">
                {mode === "withJev" ? "Dengan Jev" : "Tanpa Jev"}
              </th>
              {running.map((point, index) => {
                const previous = running[index - 1]?.[mode] ?? point[mode];
                return (
                  <td
                    key={index}
                    className={cn(
                      "py-1.5 text-right",
                      point[mode] < previous && "text-danger-text",
                    )}
                  >
                    {percent(point[mode])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
