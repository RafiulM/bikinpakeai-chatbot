import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { useLabConversation } from "@/components/lab/conversation-store";
import {
  AnalysisPanel,
  PanelSection,
} from "@/components/lab/debug/analysis-panel";
import { LabelTable } from "@/components/lab/debug/label-table";
import { MessageTabs } from "@/components/lab/debug/message-tabs";
import { RouteChoice } from "@/components/lab/debug/route-choice";
import { sortTurns } from "@/lib/lab/conversation";

export const Route = createFileRoute("/_protected/debug")({
  head: () => ({ meta: [{ title: `Debug | ${siteConfig.name}` }] }),
  component: DebugPage,
});

const PANEL_ID = "debug-analysis-panel";

function DebugPage() {
  const { conversation } = useLabConversation();
  const turns = sortTurns(conversation.turns);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  // Default to the latest message; keep the choice while it still exists.
  const selectedIndex = Math.max(
    0,
    turns.findIndex((turn) => turn.message.id === selectedId),
  );
  const selected = turns.length
    ? turns[selectedId ? selectedIndex : turns.length - 1]
    : undefined;

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Debug
          </h1>
          <p className="text-sm text-muted-foreground">
            Percakapan {conversation.code} · cara Jev membaca tiap pesan
          </p>
        </div>
        <Link
          to="/compare"
          className="text-sm font-semibold underline underline-offset-3"
        >
          Lihat dua jawabannya di Compare
        </Link>
      </div>

      {!selected ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          Belum ada pesan. Kirim pertanyaan di tampilan Customer untuk melihat
          hasil pembacaan Jev di sini.
        </p>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section
            aria-labelledby="debug-list-title"
            className="grid gap-3 rounded-[20px] border bg-card p-4"
          >
            <div className="grid gap-0.5 px-1">
              <h2 id="debug-list-title" className="text-[17px] font-semibold">
                Pesan pelanggan
              </h2>
              <p className="text-sm text-muted-foreground">
                Pilih pesan untuk melihat cara Jev membacanya.
              </p>
            </div>
            <MessageTabs
              turns={turns}
              selectedId={selected.message.id}
              onSelect={setSelectedId}
              panelId={PANEL_ID}
            />
          </section>
          <AnalysisPanel
            turn={selected}
            index={turns.indexOf(selected)}
            panelId={PANEL_ID}
          >
            {selected.analysis && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <PanelSection title="Label & skor keyakinan">
                  <LabelTable analysis={selected.analysis} />
                </PanelSection>
                <PanelSection title="Rute penanganan">
                  <RouteChoice analysis={selected.analysis} />
                </PanelSection>
              </div>
            )}
          </AnalysisPanel>
        </div>
      )}
    </div>
  );
}
