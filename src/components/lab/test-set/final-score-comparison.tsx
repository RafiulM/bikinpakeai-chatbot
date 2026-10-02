import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TestRunReport, VerdictTally } from "@/lib/lab/types";
import { ratioText } from "@/lib/lab/compare";
import { rightCount } from "@/lib/lab/test-report";
import { formatPercent, formatSeconds, formatUsd } from "@/lib/lab/format";

type VersionSummary = TestRunReport["withJev"];

const points = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 100);

function headline(jev: number, base: number) {
  const gap = jev - base;
  if (gap > 0) return `Jev unggul ${gap} poin: ${jev}% lawan ${base}%.`;
  if (gap < 0) return `Pembanding unggul ${-gap} poin: ${base}% lawan ${jev}%.`;
  return `Skor sama: ${jev}%.`;
}

/** Final scores of both versions side by side, read as a conclusion. */
export function FinalScoreComparison({
  scopeLabel,
  total,
  withJev,
  withoutJev,
  categories,
}: {
  /** What the scores cover, e.g. "Semua kategori · 80 pesan". */
  scopeLabel: string;
  total: number;
  withJev: VersionSummary;
  withoutJev: VersionSummary;
  /** Per-category scores; shown when more than one category is in scope. */
  categories?: TestRunReport["categories"];
}) {
  const jev = points(rightCount(withJev), total);
  const base = points(rightCount(withoutJev), total);
  const fewerWrong = withoutJev.wrong - withJev.wrong;
  const support = [
    ratioText(withJev.averageLatencyMs, withoutJev.averageLatencyMs, "speed"),
    ratioText(withJev.totalCostUsd, withoutJev.totalCostUsd, "cost"),
    fewerWrong > 0 ? `${fewerWrong} jawaban salah lebih sedikit` : null,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="final-score-title"
      className="grid gap-5 rounded-[16px] border bg-surface-subtle p-5 max-sm:p-4"
    >
      <div className="grid gap-2">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Kesimpulan · {scopeLabel}
        </p>
        <h3
          id="final-score-title"
          aria-live="polite"
          className="font-serif text-[clamp(26px,2.6vw,34px)] leading-[1.15] font-normal tracking-[-0.8px]"
        >
          {headline(jev, base)}
        </h3>
        {support.length > 0 && (
          <p className="text-[17px] leading-snug text-foreground/85">
            Untuk pesan dan knowledge base yang sama, versi dengan Jev{" "}
            {support.join(", ")}.
          </p>
        )}
      </div>
      <table className="w-full border-collapse text-[15px] tabular-nums">
        <caption className="sr-only">
          Skor akhir dengan Jev dan tanpa Jev, {scopeLabel}
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
          <Row label="Skor akhir">
            <Score tally={withJev} total={total} strong />
            <Score tally={withoutJev} total={total} />
          </Row>
          <Row label="Benar" dot="bg-positive">
            {withJev.correct}
            {withoutJev.correct}
          </Row>
          <Row label="Salah" dot="bg-danger">
            {withJev.wrong}
            {withoutJev.wrong}
          </Row>
          <Row label="Dieskalasi" dot="bg-warning">
            {withJev.escalated}
            {withoutJev.escalated}
          </Row>
          <Row label="Rata-rata waktu">
            {formatSeconds(withJev.averageLatencyMs)}
            {formatSeconds(withoutJev.averageLatencyMs)}
          </Row>
          <Row label="Total biaya">
            {formatUsd(withJev.totalCostUsd, 3)}
            {formatUsd(withoutJev.totalCostUsd, 3)}
          </Row>
        </tbody>
      </table>
      <p className="-mt-2 text-xs text-muted-foreground">
        Skor akhir menghitung jawaban benar ditambah penyerahan ke tim support
        yang tepat.
      </p>
      {categories && categories.length > 1 && (
        <CategoryScores categories={categories} />
      )}
    </section>
  );
}

function Row({
  label,
  dot,
  children,
}: {
  label: string;
  /** Color key matching the score bar. */
  dot?: string;
  children: [ReactNode, ReactNode];
}) {
  return (
    <tr>
      <th
        scope="row"
        className="w-[34%] py-2.5 text-left font-medium text-muted-foreground"
      >
        <span className="inline-flex items-center gap-2">
          {dot && (
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", dot)}
            />
          )}
          {label}
        </span>
      </th>
      <td className="w-[33%] py-2.5 pr-4 whitespace-nowrap">{children[0]}</td>
      <td className="w-[33%] py-2.5 pr-4 whitespace-nowrap">{children[1]}</td>
    </tr>
  );
}

/** Big percentage plus a bar split into correct, escalated, and wrong. */
function Score({
  tally,
  total,
  strong,
}: {
  tally: VerdictTally;
  total: number;
  strong?: boolean;
}) {
  const share = (count: number) =>
    `${total === 0 ? 0 : (count / total) * 100}%`;
  return (
    <>
      <span
        className={cn(
          "text-[40px] leading-none font-medium tracking-tight max-sm:text-[30px]",
          !strong && "text-muted-foreground",
        )}
      >
        {formatPercent(rightCount(tally), total)}
      </span>
      <span
        aria-hidden="true"
        className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-muted"
      >
        <span className="bg-positive" style={{ width: share(tally.correct) }} />
        <span
          className="bg-warning"
          style={{ width: share(tally.escalated) }}
        />
        <span className="bg-danger" style={{ width: share(tally.wrong) }} />
      </span>
    </>
  );
}

/** Correct-answer share per category for both versions, with the gap. */
function CategoryScores({
  categories,
}: {
  categories: TestRunReport["categories"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm tabular-nums">
        <caption className="pb-2 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Skor per kategori
        </caption>
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-3 text-left font-semibold">
              Kategori
            </th>
            <th scope="col" className="py-2 pr-3 text-left font-semibold">
              Dengan Jev
            </th>
            <th scope="col" className="py-2 pr-3 text-left font-semibold">
              Tanpa Jev
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Selisih
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
          {categories.map((item) => {
            const jev = points(item.withJev, item.total);
            const base = points(item.withoutJev, item.total);
            const gap = jev - base;
            return (
              <tr key={item.id}>
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {item.label}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {item.total} pesan
                  </span>
                </th>
                <td className="py-2 pr-3">
                  <Share value={jev} strong />
                </td>
                <td className="py-2 pr-3">
                  <Share value={base} />
                </td>
                <td
                  className={cn(
                    "py-2 text-right font-semibold whitespace-nowrap",
                    gap > 0 && "text-positive-text",
                    gap < 0 && "text-danger-text",
                  )}
                >
                  {gap > 0 ? "+" : ""}
                  {gap} poin
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Share({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-9 text-right">{value}%</span>
      <span
        aria-hidden="true"
        className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={cn(
            "block h-full rounded-full",
            strong ? "bg-foreground" : "bg-muted-foreground/60",
          )}
          style={{ width: `${value}%` }}
        />
      </span>
    </span>
  );
}
