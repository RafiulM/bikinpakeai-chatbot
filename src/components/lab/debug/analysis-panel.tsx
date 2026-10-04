import type { ReactNode } from "react";
import type { ConversationTurn, ResponseMode } from "@/lib/lab/types";
import { formatClock } from "@/lib/lab/format";
import { SegmentedControl } from "../segmented-control";
import { DecisionTag } from "./decision-tag";

/**
 * The selected message, with a switch between the two answer paths. The
 * chosen path's sections are passed as children.
 */
export function AnalysisPanel({
  turn,
  index,
  panelId,
  path,
  onPathChange,
  children,
}: {
  turn: ConversationTurn;
  index: number;
  panelId: string;
  path: ResponseMode;
  onPathChange: (path: ResponseMode) => void;
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
        <SegmentedControl
          legend="Jalur jawaban"
          value={path}
          onChange={onPathChange}
          options={[
            { value: "with_jev", label: "Dengan Jev" },
            { value: "without_jev", label: "Tanpa Jev" },
          ]}
        />
      </header>
      {children}
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
