import {
  CircleCheck,
  CircleDot,
  CircleSlash,
  Circle,
  Square,
  Eraser,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type RunState = "waiting" | "running" | "done" | "stopped" | "failed";

export interface RunItem {
  id: string;
  name: string;
  expectedRoute: string;
  state: RunState;
}

const STATE_TEXT: Record<RunState, (item: RunItem) => string> = {
  waiting: () => "Menunggu",
  running: () => "Berjalan…",
  done: () => "Selesai · terkirim ke percakapan",
  stopped: () => "Dihentikan",
  failed: () => "Gagal terkirim",
};

const STATE_ICON = {
  waiting: Circle,
  running: CircleDot,
  done: CircleCheck,
  stopped: CircleSlash,
  failed: CircleSlash,
} as const;

/** The sequential run: one scenario at a time, with progress and a stop button. */
export function RunQueue({
  items,
  running,
  onStop,
  onClear,
}: {
  items: RunItem[];
  running: boolean;
  onStop: () => void;
  onClear: () => void;
}) {
  const done = items.filter((item) => item.state === "done").length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 0;
  const finished = !running && items.length > 0;

  return (
    <aside
      aria-labelledby="run-queue-title"
      className="grid gap-4 rounded-[20px] border bg-card p-5 xl:sticky xl:top-6"
    >
      <div>
        <h2 id="run-queue-title" className="text-[17px] font-semibold">
          Antrean jalan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Skenario dikirim berurutan ke percakapan aktif.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-[10px] bg-surface-subtle p-4 text-sm text-muted-foreground">
          Belum ada yang dijalankan. Centang beberapa skenario lalu pilih
          “Jalankan terpilih”, atau jalankan satu per satu dari kartunya.
        </p>
      ) : (
        <>
          <div className="grid gap-1.5">
            <div className="flex justify-between text-sm tabular-nums">
              <span>
                {done} dari {items.length} selesai
              </span>
              <span>{percent}%</span>
            </div>
            <progress
              max={100}
              value={percent}
              aria-labelledby="run-queue-title"
              className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-foreground"
            />
          </div>
          <ol className="grid gap-2" aria-label="Urutan skenario">
            {items.map((item) => {
              const Icon = STATE_ICON[item.state];
              return (
                <li
                  key={item.id}
                  className={cn(
                    "grid grid-cols-[20px_minmax(0,1fr)] gap-x-2 gap-y-0.5 rounded-[10px] border px-3 py-2.5 text-sm",
                    item.state === "running" && "border-signal bg-signal-soft",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4",
                      item.state === "done" && "text-positive",
                      item.state === "running" && "text-signal-text",
                      item.state === "failed" && "text-danger",
                      (item.state === "waiting" || item.state === "stopped") &&
                        "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span className="font-semibold">{item.name}</span>
                  <span className="col-start-2 text-xs text-muted-foreground">
                    {STATE_TEXT[item.state](item)} · harapan{" "}
                    {item.expectedRoute}
                  </span>
                </li>
              );
            })}
          </ol>
          {finished && (
            <p
              role="status"
              className="grid gap-1 rounded-[10px] border border-positive/30 bg-positive/8 px-4 py-3 text-sm"
            >
              <strong className="font-semibold">
                {done === items.length
                  ? `${done} skenario terkirim.`
                  : `Berhenti: ${done} dari ${items.length} skenario terkirim.`}
              </strong>
              <span>
                Lihat hasilnya di{" "}
                <Link
                  to="/compare"
                  className="font-semibold underline underline-offset-3"
                >
                  Compare
                </Link>{" "}
                atau{" "}
                <Link
                  to="/debug"
                  className="font-semibold underline underline-offset-3"
                >
                  Debug
                </Link>
                .
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Button variant="outline" size="sm" onClick={onStop}>
                <Square aria-hidden="true" />
                Hentikan
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onClear}>
                <Eraser aria-hidden="true" />
                Bersihkan antrean
              </Button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
