import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  AlertCircle,
  Check,
  Headset,
  Lock,
  RotateCcw,
  ScanSearch,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pickWinner, verdictsDiffer } from "@/lib/lab/compare";
import {
  formatClock,
  formatCount,
  formatSeconds,
  formatUsd,
} from "@/lib/lab/format";
import type {
  BotResponse,
  ConversationTurn,
  ResponseMode,
} from "@/lib/lab/types";
import { BetterBadge, HighlightedAnswer, IssueList } from "./answer-highlight";
import { AnswerSignature } from "./model-logos";

export const MODE_LABEL: Record<ResponseMode, string> = {
  with_jev: "Dengan Jev",
  without_jev: "Tanpa Jev",
};

/** How long a missing answer still counts as "on its way". */
const PENDING_MS = 45_000;

/**
 * One customer message with both answers next to each other: with Jev on the
 * left, without Jev on the right. Narrow screens stack them. Each answer is
 * signed with logos instead of column titles.
 */
export function SideBySideTurn({
  turn,
  onRetry,
}: {
  turn: ConversationTurn;
  onRetry?: () => void;
}) {
  // Only a difference in being right earns the badge; time and cost are
  // printed under each answer.
  const winner = verdictsDiffer(turn) ? pickWinner(turn) : null;
  const status = turn.deliveryStatus;
  return (
    <li
      id={`turn-${turn.message.id}`}
      className="grid scroll-mt-20 gap-3 rounded-[24px] p-1 target:bg-signal-soft"
    >
      <Question turn={turn} onRetry={onRetry} />
      {status !== "failed" && (
        <div className="grid items-start gap-3 md:grid-cols-2 md:gap-4">
          <div className="grid gap-2">
            <Answer
              mode="with_jev"
              turn={turn}
              isWinner={winner === "with_jev"}
              extra={
                turn.ticketId && (
                  <p className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
                    <Headset className="size-3.5" aria-hidden="true" />
                    Diteruskan ke support · {turn.ticketId}
                  </p>
                )
              }
            />
            {turn.agentReplies?.map((reply) => (
              <div
                key={reply.id}
                className="grid gap-1.5 rounded-2xl border-2 border-foreground bg-card p-4"
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  {reply.agentName} · Tim Support ·{" "}
                  {formatClock(reply.createdAt)}
                </p>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {reply.content}
                </p>
              </div>
            ))}
          </div>
          <Answer
            mode="without_jev"
            turn={turn}
            isWinner={winner === "without_jev"}
          />
        </div>
      )}
    </li>
  );
}

export function Question({
  turn,
  onRetry,
}: {
  turn: ConversationTurn;
  onRetry?: () => void;
}) {
  const { message, deliveryStatus } = turn;
  return (
    <div className="grid justify-items-end gap-1">
      <p
        className={cn(
          "max-w-[min(80%,640px)] rounded-2xl rounded-br-md bg-foreground px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-background [overflow-wrap:anywhere]",
          deliveryStatus === "sending" && "opacity-70",
        )}
      >
        <span className="sr-only">Pertanyaan: </span>
        <MaskedText text={message.content} />
      </p>
      {deliveryStatus === "failed" ? (
        <p className="flex items-center gap-2 text-xs text-danger-text">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          Gagal terkirim.
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-full font-semibold underline underline-offset-3"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Coba lagi
            </button>
          )}
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {message.isMasked && (
            <Lock
              className="size-3"
              role="img"
              aria-label="Nomor kartu disamarkan"
            />
          )}
          {formatClock(message.createdAt)}
        </p>
      )}
    </div>
  );
}

const MASKED_CARD = /(\d{4} •••• •••• \d{4})/;

/** Renders masked card numbers as a distinct monospace token. */
function MaskedText({ text }: { text: string }) {
  return text.split(MASKED_CARD).map((part, index) =>
    index % 2 === 1 ? (
      <span
        key={index}
        className="rounded-md bg-white/15 px-1.5 font-mono text-[14px]"
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function Answer({
  mode,
  turn,
  isWinner,
  extra,
}: {
  mode: ResponseMode;
  turn: ConversationTurn;
  isWinner: boolean;
  extra?: ReactNode;
}) {
  const response = mode === "with_jev" ? turn.withJev : turn.withoutJev;
  const label = MODE_LABEL[mode];
  const modelId = response
    ? response.modelId
    : turn.answerFailures?.[mode]?.modelId;
  return (
    <section
      aria-label={`Jawaban ${label.toLowerCase()}`}
      className={cn(
        "grid content-start gap-3 rounded-2xl border bg-card p-4",
        isWinner && "border-foreground",
        !response && "bg-surface-subtle",
      )}
    >
      <AnswerSignature mode={mode} modelId={modelId} />
      {response ? (
        <>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
            <HighlightedAnswer
              text={response.content}
              phrase={response.review.highlight}
              tone={
                response.review.highlightTone ??
                (response.review.verdict === "wrong" ? "bad" : "good")
              }
              enabled
            />
          </p>
          <IssueList issues={response.review.issues} />
          {extra}
          <AnswerMeta
            response={response}
            badge={isWinner && <BetterBadge />}
            debugLink={
              mode === "with_jev" && (
                <Link
                  to="/debug"
                  hash={`turn-${turn.message.id}`}
                  aria-label="Lihat analisis Jev"
                  title="Lihat analisis Jev"
                  className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground rekam:hidden"
                >
                  <ScanSearch className="size-4" aria-hidden="true" />
                </Link>
              )
            }
          />
        </>
      ) : turn.answerFailures?.[mode] ? (
        <p className="flex items-start gap-1.5 text-sm text-danger-text">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {turn.answerFailures[mode].error}
        </p>
      ) : (
        <PendingAnswer
          since={turn.message.createdAt}
          sending={turn.deliveryStatus === "sending"}
        />
      )}
    </section>
  );
}

function AnswerMeta({
  response,
  badge,
  debugLink,
}: {
  response: BotResponse;
  badge?: ReactNode;
  debugLink?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3 text-sm">
      <VerdictLabel response={response} />
      <span className="text-muted-foreground tabular-nums">
        <span className="sr-only">Waktu </span>
        {formatSeconds(response.latencyMs)}
      </span>
      <span className="text-muted-foreground tabular-nums">
        <span className="sr-only">Biaya </span>
        {formatUsd(response.costUsd)}
      </span>
      {response.docCount != null && (
        <span
          className="text-muted-foreground tabular-nums"
          title="Dokumen basis pengetahuan yang dikirim ke model"
        >
          {formatCount(response.docCount)} dokumen
        </span>
      )}
      {response.inputTokens !== undefined && (
        <span
          className="text-muted-foreground tabular-nums"
          title={
            response.mode === "with_jev"
              ? "Token masuk: pembacaan Jev ditambah penangan"
              : "Token masuk ke model"
          }
        >
          {formatCount(response.inputTokens)} token masuk
        </span>
      )}
      <span className="ml-auto inline-flex items-center gap-1">
        {debugLink}
        {badge}
      </span>
    </div>
  );
}

export function VerdictLabel({ response }: { response: BotResponse }) {
  const { verdict, verdictLabel } = response.review;
  const Icon =
    verdict === "wrong" ? X : verdict === "escalated" ? Headset : Check;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        verdict === "wrong" && "text-danger-text",
      )}
    >
      <Icon
        className={cn("size-4", verdict !== "wrong" && "text-positive")}
        aria-hidden="true"
      />
      {verdictLabel}
    </span>
  );
}

/**
 * Typing dots while an answer is on its way. The answer without Jev usually
 * lands a little later; after a while a missing answer reads as unavailable.
 */
export function PendingAnswer({
  since,
  sending,
  expiredText = "Tidak tersedia.",
}: {
  since: string;
  sending: boolean;
  expiredText?: string;
}) {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (sending) return;
    const left = PENDING_MS - (Date.now() - new Date(since).getTime());
    const timer = setTimeout(() => setExpired(true), Math.max(left, 0));
    return () => clearTimeout(timer);
  }, [since, sending]);

  if (expired)
    return <p className="text-sm text-muted-foreground">{expiredText}</p>;
  return (
    <p className="flex h-6 items-center gap-1">
      <span className="sr-only">Menunggu jawaban…</span>
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          aria-hidden="true"
          className="size-1.5 rounded-full bg-muted-foreground"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </p>
  );
}
