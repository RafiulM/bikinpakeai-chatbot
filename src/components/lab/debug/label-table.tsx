import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JevAnalysis } from "@/lib/lab/types";

const LOW_CONFIDENCE = 0.7;

/** Every label Jev picked for a message, with how sure it was of each one. */
export function LabelTable({ analysis }: { analysis: JevAnalysis }) {
  return (
    <div className="grid gap-2">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Label hasil klasifikasi Jev dan skor keyakinannya
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Nilai</th>
            <th scope="col">Keyakinan</th>
          </tr>
        </thead>
        <tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
          {analysis.labels.map((label) => {
            const percent = Math.round(label.confidence * 100);
            const low = label.confidence < LOW_CONFIDENCE;
            return (
              <tr key={label.label}>
                <th
                  scope="row"
                  className="w-[34%] py-2.5 pr-2 text-left align-middle font-medium text-muted-foreground"
                >
                  {label.label}
                </th>
                <td
                  className={cn(
                    "py-2.5 pr-3 align-middle font-medium [overflow-wrap:anywhere]",
                    label.flagged && "text-danger-text",
                  )}
                >
                  {label.value}
                  {label.flagged && (
                    <span className="sr-only"> (memicu aturan)</span>
                  )}
                </td>
                <td className="w-[38%] py-2.5 align-middle">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                    >
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          low ? "bg-warning" : "bg-foreground",
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="min-w-[38px] text-right text-xs font-semibold tabular-nums">
                      {percent}%
                    </span>
                  </span>
                  {low && (
                    <span className="mt-1 flex items-center gap-1 text-xs text-warning-text">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      Keyakinan rendah, perlu dicek
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">
        Satu panggilan klasifikasi menghasilkan semua label · keyakinan
        keseluruhan {Math.round(analysis.confidence * 100)}%.
      </p>
    </div>
  );
}
