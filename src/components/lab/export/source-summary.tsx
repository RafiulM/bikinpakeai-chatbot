import { MessagesSquare, FlaskConical } from "lucide-react";
import type { TestRunState } from "@/lib/lab/types";
import type { ConversationSummary } from "@/lib/lab/compare";

const percent = (part: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;

/** The two sources every export draws from, with their headline numbers. */
export function SourceSummary({
  conversation,
  lastRun,
  loadingRun,
}: {
  conversation: {
    code: string;
    title: string;
    messageCount: number;
    summary: ConversationSummary;
  };
  lastRun: TestRunState | null;
  loadingRun: boolean;
}) {
  const { summary } = conversation;
  return (
    <section
      aria-labelledby="export-sources"
      className="grid gap-3 rounded-[20px] border bg-surface-subtle p-5 max-sm:p-4"
    >
      <h2
        id="export-sources"
        className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
      >
        Sumber data
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="flex gap-3">
          <MessagesSquare
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="grid gap-0.5">
            <dt className="text-sm font-semibold">Percakapan aktif</dt>
            <dd className="text-sm [overflow-wrap:anywhere]">
              {conversation.code} · {conversation.title}
            </dd>
            <dd className="text-sm text-muted-foreground tabular-nums">
              {conversation.messageCount === 0
                ? "Belum ada pesan"
                : `${conversation.messageCount} pesan · ketepatan Jev ${percent(summary.withJev.correct, summary.compared)} lawan ${percent(summary.withoutJev.correct, summary.compared)}`}
            </dd>
          </div>
        </div>
        <div className="flex gap-3">
          <FlaskConical
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="grid gap-0.5">
            <dt className="text-sm font-semibold">Uji test set terakhir</dt>
            {loadingRun ? (
              <dd className="text-sm text-muted-foreground">Memuat…</dd>
            ) : lastRun ? (
              <>
                <dd className="text-sm">
                  Run #{lastRun.runNumber} · {lastRun.testSetName}
                </dd>
                <dd className="text-sm text-muted-foreground tabular-nums">
                  {lastRun.total} pesan · skor Jev{" "}
                  {percent(
                    lastRun.withJev.correct + lastRun.withJev.escalated,
                    lastRun.total,
                  )}{" "}
                  lawan{" "}
                  {percent(
                    lastRun.withoutJev.correct + lastRun.withoutJev.escalated,
                    lastRun.total,
                  )}
                </dd>
              </>
            ) : (
              <dd className="text-sm text-muted-foreground">
                Belum ada uji yang selesai
              </dd>
            )}
          </div>
        </div>
      </dl>
    </section>
  );
}
