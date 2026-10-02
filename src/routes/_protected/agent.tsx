import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { mockConversation } from "@/lib/lab/mock-data";

export const Route = createFileRoute("/_protected/agent")({
  head: () => ({ meta: [{ title: `Agent | ${siteConfig.name}` }] }),
  component: AgentPage,
});

// Placeholder view: the support queue arrives in phase 2. It lists the
// escalations from the shared conversation so the context carries over.
function AgentPage() {
  const escalated = mockConversation.turns.filter((turn) => turn.ticketId);
  return (
    <div className="grid max-w-[1200px] gap-6">
      <div>
        <h1 className="text-[22px] leading-tight font-medium tracking-tight">
          Agent
        </h1>
        <p className="text-sm text-muted-foreground">
          Antrean tiket untuk tim support manusia
        </p>
      </div>
      <p className="rounded-[10px] border border-signal bg-signal-soft px-4 py-3 text-sm">
        Tampilan tiruan. Antrean lengkap dengan prioritas, ringkasan, balas, dan
        tutup tiket dibangun di fase berikutnya.
      </p>
      {escalated.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
          Belum ada kasus yang dieskalasi.
        </p>
      ) : (
        <ul className="grid gap-3">
          {escalated.map((turn) => (
            <li
              key={turn.message.id}
              className="grid gap-1 rounded-2xl border bg-card p-4"
            >
              <p className="text-sm font-semibold">
                {turn.ticketId} · Percakapan {mockConversation.code}
              </p>
              <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                “{turn.message.content}”
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
