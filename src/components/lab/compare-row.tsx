import type { ReactNode } from "react";
import type { BotResponse, ConversationTurn } from "@/lib/lab/types";
import { pickWinner } from "@/lib/lab/compare";
import { formatClock } from "@/lib/lab/format";
import { AnswerCard } from "./answer-card";
import { BetterBadge, HighlightedAnswer, IssueList } from "./answer-highlight";

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
  highlight = true,
}: {
  turn: ConversationTurn;
  index: number;
  footer?: ReactNode;
  /** Show marks and problem lists ("Sorot perbedaan"). */
  highlight?: boolean;
}) {
  const winner = pickWinner(turn);
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
        <ComparedAnswer
          response={turn.withJev}
          isWinner={winner === "with_jev"}
          highlight={highlight}
        />
        <ComparedAnswer
          response={turn.withoutJev}
          isWinner={winner === "without_jev"}
          highlight={highlight}
        />
      </div>
      {footer}
    </article>
  );
}

function ComparedAnswer({
  response,
  isWinner,
  highlight,
}: {
  response: BotResponse | null;
  isWinner: boolean;
  highlight: boolean;
}) {
  if (!response) return <AnswerCard response={null} />;
  const tone =
    response.review.highlightTone ??
    (response.review.verdict === "wrong" ? "bad" : "good");
  return (
    <AnswerCard
      response={response}
      emphasized={isWinner}
      badge={isWinner && <BetterBadge />}
      extra={highlight && <IssueList issues={response.review.issues} />}
    >
      <HighlightedAnswer
        text={response.content}
        phrase={response.review.highlight}
        tone={tone}
        enabled={highlight}
      />
    </AnswerCard>
  );
}
