import type { ConversationTurn } from "@/lib/lab/types";
import { formatSeconds, formatUsd } from "@/lib/lab/format";

/**
 * How long each Jev step took, then the total time and cost next to the
 * answer produced without Jev for the same message.
 */
export function TimingBreakdown({ turn }: { turn: ConversationTurn }) {
  const analysis = turn.analysis;
  if (!analysis) return null;
  const steps = analysis.steps;
  const stepTotal = steps.reduce((sum, step) => sum + step.durationMs, 0);
  const jevMs = turn.withJev?.latencyMs ?? stepTotal;

  return (
    <div className="grid gap-4">
      <ol className="grid gap-3">
        {steps.map((step, index) => {
          const share = stepTotal ? (step.durationMs / stepTotal) * 100 : 0;
          return (
            <li
              key={step.name}
              className="grid grid-cols-[28px_170px_minmax(0,1fr)_72px] items-center gap-3 text-sm max-md:grid-cols-[28px_minmax(0,1fr)_64px]"
            >
              <span className="grid size-6 place-items-center rounded-full border border-border-strong text-xs font-semibold text-foreground/80">
                {index + 1}
              </span>
              <span className="grid leading-tight">
                {step.name}
                <small className="text-xs text-muted-foreground">
                  {step.note}
                </small>
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-full bg-muted max-md:col-start-2 max-md:col-end-4 max-md:row-start-2"
              >
                <span
                  className="block h-full rounded-full bg-foreground"
                  style={{ width: `${Math.max(2, share)}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-foreground/80">
                {step.durationMs} ms
              </span>
            </li>
          );
        })}
      </ol>
      <table className="w-full border-collapse border-t text-sm tabular-nums">
        <caption className="sr-only">
          Total waktu dan biaya untuk pesan ini, dengan dan tanpa Jev
        </caption>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <td className="pt-3" />
            <th
              scope="col"
              className="pt-3 text-left font-semibold text-foreground"
            >
              Dengan Jev
            </th>
            <th scope="col" className="pt-3 text-left font-semibold">
              Tanpa Jev
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th
              scope="row"
              className="py-1.5 text-left font-medium text-muted-foreground"
            >
              Waktu proses
            </th>
            <td className="py-1.5 text-[17px] font-semibold">
              {formatSeconds(jevMs)}
            </td>
            <td className="py-1.5 text-[17px] font-semibold">
              {turn.withoutJev ? formatSeconds(turn.withoutJev.latencyMs) : "—"}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-1.5 text-left font-medium text-muted-foreground"
            >
              Model penjawab
            </th>
            <td className="py-1.5 font-mono text-[13px] [overflow-wrap:anywhere]">
              {turn.withJev
                ? (turn.withJev.modelId ?? "Template, tanpa model")
                : "—"}
            </td>
            <td className="py-1.5 font-mono text-[13px] [overflow-wrap:anywhere]">
              {turn.withoutJev?.modelId ??
                turn.answerFailures?.without_jev?.modelId ??
                "—"}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-1.5 text-left font-medium text-muted-foreground"
            >
              Biaya pesan
            </th>
            <td className="py-1.5 text-[17px] font-semibold">
              {turn.withJev ? formatUsd(turn.withJev.costUsd) : "—"}
            </td>
            <td className="py-1.5 text-[17px] font-semibold">
              {turn.withoutJev ? formatUsd(turn.withoutJev.costUsd) : "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
