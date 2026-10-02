import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Headset, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/lab/segmented-control";
import type { TestCaseOutcome, TestCaseResult } from "@/lib/lab/types";
import { formatSeconds } from "@/lib/lab/format";

const PAGE_SIZE = 20;
type CaseFilter = "all" | "differs" | "jev_wrong";

function Verdict({ outcome }: { outcome: TestCaseOutcome }) {
  if (outcome.verdict === "wrong")
    return (
      <span className="inline-flex items-center gap-1 text-danger-text">
        <X className="size-4" aria-hidden="true" />
        Salah
      </span>
    );
  const Icon = outcome.verdict === "escalated" ? Headset : Check;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-4 text-positive" aria-hidden="true" />
      {outcome.verdict === "escalated" ? "Dieskalasi" : "Benar"}
    </span>
  );
}

const right = (outcome: TestCaseOutcome) => outcome.verdict !== "wrong";

/** Every test message with both outcomes, filterable and paged. */
export function CaseResults({ cases }: { cases: TestCaseResult[] }) {
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [page, setPage] = useState(0);

  const shown = useMemo(
    () =>
      cases.filter((item) =>
        filter === "differs"
          ? right(item.withJev) !== right(item.withoutJev)
          : filter === "jev_wrong"
            ? !right(item.withJev)
            : true,
      ),
    [cases, filter],
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = shown.slice(
    current * PAGE_SIZE,
    current * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <section aria-labelledby="case-results-title" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          id="case-results-title"
          className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Hasil per pesan
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            legend="Tampilkan hasil"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(0);
            }}
            options={[
              { value: "all", label: "Semua" },
              { value: "differs", label: "Hasil berbeda" },
              { value: "jev_wrong", label: "Jev salah" },
            ]}
          />
          <p role="status" className="text-sm text-muted-foreground">
            {shown.length} dari {cases.length} pesan
          </p>
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-[10px] border border-dashed p-4 text-center text-sm text-muted-foreground">
          Tidak ada pesan untuk filter ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">
              Hasil per pesan, halaman {current + 1} dari {pages}
            </caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-2 font-semibold">
                  #
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Pesan
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Label
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Dengan Jev
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Tanpa Jev
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Waktu (Jev / tanpa)
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
              {slice.map((item) => (
                <tr key={item.caseId}>
                  <td className="py-2 pr-2 text-muted-foreground tabular-nums">
                    {cases.indexOf(item) + 1}
                  </td>
                  <td className="max-w-[320px] py-2 pr-3">
                    <span className="line-clamp-2">{item.inputText}</span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {item.expectedLabel}
                  </td>
                  <td className="py-2 pr-3">
                    <Verdict outcome={item.withJev} />
                  </td>
                  <td className="py-2 pr-3">
                    <Verdict outcome={item.withoutJev} />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap tabular-nums">
                    {formatSeconds(item.withJev.latencyMs)} /{" "}
                    {formatSeconds(item.withoutJev.latencyMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav
          aria-label="Halaman hasil"
          className="flex items-center justify-end gap-2 text-sm"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft aria-hidden="true" />
            Sebelumnya
          </Button>
          <span className="tabular-nums">
            Halaman {current + 1} dari {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Berikutnya
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </section>
  );
}
