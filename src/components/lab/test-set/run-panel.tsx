import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TestSetSummary } from "@/lib/lab/types";
import type { RunProgress } from "./use-test-run";

/** Start, watch and cancel a mass test run, with a live tally per path. */
export function RunPanel({
  set,
  progress,
  onStart,
  onCancel,
}: {
  set: TestSetSummary | undefined;
  progress: RunProgress;
  onStart: () => void;
  onCancel: () => void;
}) {
  const running = progress.status === "running";
  const percent = progress.total
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="grid gap-4">
      {progress.status === "idle" ? (
        <p className="rounded-[10px] bg-surface-subtle p-4 text-sm leading-normal text-muted-foreground">
          {set
            ? "Siap dijalankan. Proses berjalan di latar; kamu boleh pindah tampilan selama uji berlangsung."
            : "Pilih test set atau unggah berkas dulu."}
        </p>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <div className="flex justify-between text-sm tabular-nums">
              <span>
                {progress.processed} dari {progress.total} pesan
              </span>
              <span>{percent}%</span>
            </div>
            <progress
              max={100}
              value={percent}
              aria-label="Kemajuan uji massal"
              className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-foreground"
            />
          </div>
          <table className="w-full border-collapse text-sm tabular-nums">
            <caption className="sr-only">Hasil sementara</caption>
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th scope="col" className="py-2 text-left font-semibold">
                  {running ? "Sementara" : "Hasil"}
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Benar
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Salah
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Dieskalasi
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
              {(
                [
                  ["Dengan Jev", progress.withJev],
                  ["Tanpa Jev", progress.withoutJev],
                ] as const
              ).map(([label, tally]) => (
                <tr key={label}>
                  <th scope="row" className="py-2 text-left font-medium">
                    {label}
                  </th>
                  <td className="py-2 text-right">{tally.correct}</td>
                  <td className="py-2 text-right">{tally.wrong}</td>
                  <td className="py-2 text-right">{tally.escalated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p role="status" className="text-sm">
        {progress.message}
      </p>
      <div className="flex flex-wrap gap-2">
        {running ? (
          <Button variant="outline" onClick={onCancel}>
            <Square aria-hidden="true" />
            Batalkan
          </Button>
        ) : (
          <Button onClick={onStart} disabled={!set}>
            <Play aria-hidden="true" />
            {progress.status === "idle" ? "Jalankan uji" : "Jalankan lagi"}
          </Button>
        )}
      </div>
    </div>
  );
}
