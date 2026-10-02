import { useState } from "react";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { CaseResults } from "@/components/lab/test-set/case-results";
import type { IssueType, TestRunReport } from "@/lib/lab/types";
import { formatPercent } from "@/lib/lab/format";

/** Final scores and per-message results, narrowed by issue category. */
export function ReportSummary({ report }: { report: TestRunReport }) {
  const [category, setCategory] = useState<IssueType | "all">("all");
  const scope = report.categories.find((item) => item.id === category);
  const total = scope?.total ?? report.total;
  const withJev = scope?.withJev ?? report.withJev.correct;
  const withoutJev = scope?.withoutJev ?? report.withoutJev.correct;
  const title = scope ? `Skor ${scope.label}` : "Skor akhir";

  return (
    <div className="grid gap-5">
      {report.categories.length > 0 && (
        <div className="grid gap-2">
          <p
            aria-hidden="true"
            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Kategori masalah
          </p>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <SegmentedControl
              legend="Kategori masalah"
              nowrap
              value={category}
              onChange={setCategory}
              options={[
                { value: "all", label: "Semua", count: report.total },
                ...report.categories.map((item) => ({
                  value: item.id,
                  label: item.label,
                  count: item.total,
                })),
              ]}
            />
          </div>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-4 sm:max-w-md" aria-live="polite">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">
            {title} · Dengan Jev
          </dt>
          <dd className="text-[40px] font-medium tracking-tight tabular-nums">
            {formatPercent(withJev, total)}
          </dd>
          <dd className="text-sm text-muted-foreground tabular-nums">
            {withJev} dari {total} benar
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">
            {title} · Tanpa Jev
          </dt>
          <dd className="text-[40px] font-medium tracking-tight text-muted-foreground tabular-nums">
            {formatPercent(withoutJev, total)}
          </dd>
          <dd className="text-sm text-muted-foreground tabular-nums">
            {withoutJev} dari {total} benar
          </dd>
        </div>
      </dl>
      {report.cases && (
        <CaseResults key={category} cases={report.cases} category={category} />
      )}
    </div>
  );
}
