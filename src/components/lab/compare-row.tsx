import type { ReactNode } from "react";
import type { ConversationTurn } from "@/lib/lab/types";
import { formatClock } from "@/lib/lab/format";
import { AnswerCard } from "./answer-card";

const ISSUE_LABEL = {
  pembayaran: "Pembayaran",
  akses_akun: "Akses akun",
  cara_pakai: "Cara pakai",
  bug: "Bug",
  saran_fitur: "Saran fitur",
} as const;

/** One customer message with both answers next to each other. */
export function CompareRow({
  turn,
  index,
  footer,
}: {
  turn: ConversationTurn;
  index: number;
  footer?: ReactNode;
}) {
  const questionId = `compare-q-${turn.message.id}`;
  const topic = turn.analysis ? ISSUE_LABEL[turn.analysis.issueType] : null;
  return (
    <article
      id={`turn-${turn.message.id}`}
      aria-labelledby={questionId}
      className="grid scroll-mt-6 gap-4 rounded-[20px] border bg-card p-6 target:border-foreground max-sm:p-4"
    >
      <header>
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Pesan {index + 1} · {formatClock(turn.message.createdAt)}
          {topic && ` · ${topic}`}
        </p>
        <p
          id={questionId}
          className="mt-1 text-[17px] leading-snug font-medium [overflow-wrap:anywhere]"
        >
          “{turn.message.content}”
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <AnswerCard response={turn.withJev} />
        <AnswerCard response={turn.withoutJev} />
      </div>
      {footer}
    </article>
  );
}
