import type { ReactNode } from "react";
import type { ConversationTurn } from "@/lib/lab/types";
import { formatClock } from "@/lib/lab/format";
import { AnalysisState } from "./analysis-state";
import { DecisionTag } from "./decision-tag";

/** The selected message and how Jev read it. Sections are passed as children. */
export function AnalysisPanel({
  turn,
  index,
  panelId,
  onRetryAnalysis,
  children,
}: {
  turn: ConversationTurn;
  index: number;
  panelId: string;
  /** Re-run Jev on a message whose analysis failed. */
  onRetryAnalysis?: () => void;
  children: ReactNode;
}) {
  return (
    <section
      id={panelId}
      role="tabpanel"
      aria-labelledby={`debug-tab-${turn.message.id}`}
      tabIndex={0}
      className="grid gap-5 rounded-[20px] border bg-card p-6 max-sm:p-4"
    >
      <header className="grid gap-3 border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px] font-semibold">
            Pesan {index + 1} · {formatClock(turn.message.createdAt)}
          </h2>
          {turn.analysis && (
            <DecisionTag decision={turn.analysis.decision} long />
          )}
        </div>
        <p className="font-serif text-[22px] leading-snug tracking-[-0.4px] [overflow-wrap:anywhere]">
          “{turn.message.content}”
        </p>
      </header>
      {turn.analysis ? (
        children
      ) : (
        <AnalysisState turn={turn} onRetry={onRetryAnalysis} />
      )}
    </section>
  );
}

export function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid content-start gap-3">
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
