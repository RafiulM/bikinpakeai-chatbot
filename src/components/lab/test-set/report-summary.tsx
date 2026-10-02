import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { CaseResults } from "@/components/lab/test-set/case-results";
import { FinalScoreComparison } from "@/components/lab/test-set/final-score-comparison";
import type { IssueType, TestRunReport } from "@/lib/lab/types";
import { summarizeCases } from "@/lib/lab/test-report";

/** Final scores and per-message results, narrowed by issue category. */
export function ReportSummary({ report }: { report: TestRunReport }) {
  const [category, setCategory] = useState<IssueType | "all">("all");
  const scope = report.categories.find((item) => item.id === category);
  // Category totals come from the per-message rows, so the filter is only
  // offered once those are loaded.
  const cases = report.cases;
  const scoped = useMemo(
    () =>
      scope && cases
        ? {
            total: scope.total,
            ...summarizeCases(
              cases.filter((item) => item.category === scope.id),
            ),
          }
        : null,
    [cases, scope],
  );
  const total = scoped?.total ?? report.total;

  return (
    <div className="grid gap-5">
      {cases && report.categories.length > 1 && (
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
      <FinalScoreComparison
        scopeLabel={`${scope?.label ?? "Semua kategori"} · ${total} pesan`}
        total={total}
        withJev={scoped?.withJev ?? report.withJev}
        withoutJev={scoped?.withoutJev ?? report.withoutJev}
        categories={scope ? undefined : report.categories}
      />
      {cases && (
        <CaseResults key={category} cases={cases} category={category} />
      )}
    </div>
  );
}
