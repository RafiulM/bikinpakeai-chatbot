import { createFileRoute, Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { useConversationParam } from "@/components/lab/use-conversation-param";
import { sortTurns } from "@/lib/lab/conversation";
import { formatClock, formatSeconds, formatUsd } from "@/lib/lab/format";
import { mockConversation } from "@/lib/lab/mock-data";

export const Route = createFileRoute("/_protected/debug")({
  head: () => ({ meta: [{ title: `Debug | ${siteConfig.name}` }] }),
  component: DebugPage,
});

// Placeholder view: the full Jev debug panel arrives in phase 2. It already
// reads the same conversation so switching views keeps the context.
function DebugPage() {
  const turns = sortTurns(mockConversation.turns);
  useConversationParam(mockConversation.id);
  return (
    <div className="grid max-w-[1200px] gap-6">
      <div>
        <h1 className="text-[22px] leading-tight font-medium tracking-tight">
          Debug
        </h1>
        <p className="text-sm text-muted-foreground">
          Percakapan {mockConversation.code} · cara Jev membaca tiap pesan
        </p>
      </div>
      <p className="rounded-[10px] border border-signal bg-signal-soft px-4 py-3 text-sm">
        Tampilan tiruan. Panel label, skor keyakinan, rute, dan alasan keputusan
        lengkap dibangun di fase berikutnya.
      </p>
      <ol className="grid gap-3">
        {turns.map((turn, index) => (
          <li
            key={turn.message.id}
            className="grid gap-2 rounded-2xl border bg-card p-4"
          >
            <p className="text-xs font-semibold text-muted-foreground">
              Pesan {index + 1} · {formatClock(turn.message.createdAt)}
            </p>
            <p className="font-medium [overflow-wrap:anywhere]">
              “{turn.message.content}”
            </p>
            {turn.analysis && turn.withJev && (
              <p className="text-sm text-muted-foreground">
                {turn.analysis.routeLabel} ·{" "}
                {formatSeconds(turn.withJev.latencyMs)} ·{" "}
                {formatUsd(turn.withJev.costUsd)}
              </p>
            )}
          </li>
        ))}
      </ol>
      <Link
        to="/compare"
        className="text-sm font-semibold underline underline-offset-3"
      >
        Lihat dua jawabannya di Compare
      </Link>
    </div>
  );
}
