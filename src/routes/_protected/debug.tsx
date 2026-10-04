import { useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { useLabConversation } from "@/components/lab/conversation-store";
import {
  AnalysisPanel,
  PanelSection,
} from "@/components/lab/debug/analysis-panel";
import { AnalysisState } from "@/components/lab/debug/analysis-state";
import { BaselineDebug } from "@/components/lab/debug/baseline-debug";
import { DecisionReason } from "@/components/lab/debug/decision-reason";
import { LabelTable } from "@/components/lab/debug/label-table";
import { MessageTabs } from "@/components/lab/debug/message-tabs";
import { RouteMap } from "@/components/lab/debug/route-map";
import { TimingBreakdown } from "@/components/lab/debug/timing-breakdown";
import { SessionPicker } from "@/components/lab/sessions/session-picker";
import { sortTurns } from "@/lib/lab/conversation";
import type { ResponseMode } from "@/lib/lab/types";

export const Route = createFileRoute("/_protected/debug")({
  head: () => ({ meta: [{ title: `Debug | ${siteConfig.name}` }] }),
  component: DebugPage,
});

const PANEL_ID = "debug-analysis-panel";

function DebugPage() {
  const { conversation } = useLabConversation();
  const turns = sortTurns(conversation.turns);
  // Opening /debug#turn-<messageId> preselects that message.
  const hash = useLocation({ select: (location) => location.hash });
  const [selectedId, setSelectedId] = useState<string | undefined>(() =>
    hash.startsWith("turn-") ? hash.slice(5) : undefined,
  );
  // The chosen path stays while moving between messages.
  const [path, setPath] = useState<ResponseMode>("with_jev");
  // Default to the latest message; keep the choice while it still exists
  // (switching to another session falls back to its latest message).
  const selectedIndex = turns.findIndex(
    (turn) => turn.message.id === selectedId,
  );
  const selected = turns.length
    ? turns[selectedIndex === -1 ? turns.length - 1 : selectedIndex]
    : undefined;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Debug
          </h1>
          <p className="text-sm text-muted-foreground">
            Cara Jev membaca tiap pesan
            {conversation.turns.length > 0 && (
              <>
                {" "}
                di sesi{" "}
                <span className="font-medium text-foreground">
                  {conversation.title}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-4 rekam:hidden">
          <SessionPicker conversation={conversation} />
          <Link
            to="/compare"
            hash={selected ? `turn-${selected.message.id}` : undefined}
            className="text-sm font-semibold underline underline-offset-3"
          >
            Lihat di Chat
          </Link>
        </div>
      </div>

      {!selected ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          Belum ada pesan di sesi ini. Kirim pertanyaan di Chat, atau pilih sesi
          tersimpan lain untuk direview.
        </p>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section
            aria-labelledby="debug-list-title"
            className="grid gap-3 rounded-[20px] border bg-card p-4"
          >
            <h2
              id="debug-list-title"
              className="px-1 text-[17px] font-semibold"
            >
              Pesan pelanggan
            </h2>
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
            path={path}
            onPathChange={setPath}
          >
            {path === "without_jev" ? (
              <BaselineDebug turn={selected} />
            ) : !selected.analysis ? (
              <AnalysisState turn={selected} />
            ) : (
              <>
                <PanelSection title="Rute penanganan">
                  <RouteMap turn={selected} analysis={selected.analysis} />
                </PanelSection>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                  <PanelSection title="Label & skor keyakinan">
                    <LabelTable analysis={selected.analysis} />
                  </PanelSection>
                  <PanelSection title="Alasan keputusan">
                    <DecisionReason analysis={selected.analysis} />
                  </PanelSection>
                </div>
                <PanelSection title="Waktu proses & biaya">
                  <TimingBreakdown turn={selected} />
                </PanelSection>
              </>
            )}
          </AnalysisPanel>
        </div>
      )}
    </div>
  );
}
