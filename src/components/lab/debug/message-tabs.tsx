import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { ConversationTurn } from "@/lib/lab/types";
import { formatClock, formatSeconds } from "@/lib/lab/format";
import { DecisionTag } from "./decision-tag";

/**
 * Vertical tab list of customer messages. Arrow keys, Home and End move the
 * selection, following the ARIA tabs pattern.
 */
export function MessageTabs({
  turns,
  selectedId,
  onSelect,
  panelId,
}: {
  turns: ConversationTurn[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  panelId: string;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const next = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: turns.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = turns[(next + turns.length) % turns.length];
    onSelect(target.message.id);
    refs.current.get(target.message.id)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      aria-label="Pesan dalam percakapan"
      className="grid gap-2 max-xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
    >
      {turns.map((turn, index) => {
        const selected = turn.message.id === selectedId;
        return (
          <button
            key={turn.message.id}
            ref={(node) => {
              if (node) refs.current.set(turn.message.id, node);
              else refs.current.delete(turn.message.id);
            }}
            type="button"
            role="tab"
            id={`debug-tab-${turn.message.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(turn.message.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "grid gap-2 rounded-[10px] border bg-card p-3 text-left transition-colors hover:border-border-strong",
              selected &&
                "border-foreground bg-canvas-warm shadow-[inset_3px_0_0_var(--signal)]",
            )}
          >
            <span className="flex justify-between gap-2 text-xs font-semibold text-muted-foreground">
              <span>
                Pesan {index + 1} · {formatClock(turn.message.createdAt)}
              </span>
              {turn.withJev && (
                <span className="tabular-nums">
                  {formatSeconds(turn.withJev.latencyMs)}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-sm leading-normal [overflow-wrap:anywhere]">
              {turn.message.content}
            </span>
            <span className="flex flex-wrap gap-1">
              {turn.analysis ? (
                <DecisionTag decision={turn.analysis.decision} />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Belum dianalisis
                </span>
              )}
              {turn.ticketId && (
                <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold">
                  Tiket {turn.ticketId}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
