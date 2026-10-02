import type { ConversationTurn } from "@/lib/lab/types";
import { turnDelta } from "@/lib/lab/compare";
import { formatSeconds, formatUsd } from "@/lib/lab/format";

const ACCURACY_TEXT = {
  jev_better: "Hanya Jev yang menjawab tepat",
  base_better: "Hanya pembanding yang menjawab tepat",
  both_right: "Sama-sama tepat",
  both_wrong: "Keduanya belum tepat",
} as const;

/** Per-message difference between the two answers, always from Jev's side. */
export function DeltaStrip({ turn }: { turn: ConversationTurn }) {
  const delta = turnDelta(turn);
  if (!delta) return null;

  const time =
    delta.latencyMs === 0
      ? "Waktu sama"
      : `${formatSeconds(Math.abs(delta.latencyMs))} lebih ${delta.latencyMs > 0 ? "cepat" : "lambat"}`;
  const cost =
    delta.costUsd === 0
      ? "Biaya sama"
      : `${formatUsd(Math.abs(delta.costUsd))} lebih ${delta.costUsd > 0 ? "hemat" : "mahal"}`;

  return (
    <dl
      aria-label="Selisih dengan Jev dibanding tanpa Jev"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[10px] bg-background px-4 py-2.5 text-sm"
    >
      <dt className="font-semibold text-muted-foreground">Selisih Jev</dt>
      <dd className="font-semibold tabular-nums">{time}</dd>
      <dd className="font-semibold tabular-nums">{cost}</dd>
      <dd>
        {ACCURACY_TEXT[delta.accuracy]}
        {turn.takeaway && ` · ${turn.takeaway}`}
      </dd>
    </dl>
  );
}
