import type { ReactNode } from "react";
import { Bot, Headset } from "lucide-react";
import { formatClock } from "@/lib/lab/format";
import type {
  BotResponse,
  ConversationTurn,
  ResponseMode,
} from "@/lib/lab/types";
import { PendingAnswer, Question } from "./side-by-side";

export const BOT_NAME = "Asisten Bikinpakeai";

const UNAVAILABLE =
  "Maaf, asisten belum bisa menjawab sekarang. Coba kirim ulang pertanyaan Anda.";

/**
 * One customer message and the reply of a single chatbot, the way a customer
 * sees it: no review, time, or cost. Only the bot with Jev hands over to the
 * support team, so its ticket notice and agent replies show in that mode.
 */
export function ChatbotTurn({
  turn,
  mode,
  onRetry,
}: {
  turn: ConversationTurn;
  mode: ResponseMode;
  onRetry?: () => void;
}) {
  const response = mode === "with_jev" ? turn.withJev : turn.withoutJev;
  const failed = !response && turn.answerFailures?.[mode];
  const jev = mode === "with_jev";
  return (
    <li
      id={`turn-${turn.message.id}`}
      className="grid scroll-mt-24 gap-3 rounded-[24px] p-1 target:bg-signal-soft"
    >
      <Question turn={turn} onRetry={onRetry} />
      {turn.deliveryStatus !== "failed" && (
        <>
          <Reply
            name={BOT_NAME}
            avatar={<Bot className="size-4" aria-hidden="true" />}
            time={
              response
                ? answeredAt(turn.message.createdAt, response)
                : undefined
            }
          >
            {response ? (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                {response.content}
              </p>
            ) : failed ? (
              <p className="text-[15px] text-muted-foreground">{UNAVAILABLE}</p>
            ) : (
              <PendingAnswer
                since={turn.message.createdAt}
                sending={turn.deliveryStatus === "sending"}
                expiredText={UNAVAILABLE}
              />
            )}
          </Reply>
          {jev && response && turn.ticketId && (
            <p className="ml-10 inline-flex w-fit items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
              <Headset className="size-3.5" aria-hidden="true" />
              Diteruskan ke tim support · tiket {turn.ticketId}
            </p>
          )}
          {jev &&
            turn.agentReplies?.map((reply) => (
              <Reply
                key={reply.id}
                name={`${reply.agentName} · Tim Support`}
                avatar={<Headset className="size-4" aria-hidden="true" />}
                time={reply.createdAt}
                agent
              >
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {reply.content}
                </p>
              </Reply>
            ))}
        </>
      )}
    </li>
  );
}

/** Answers carry no timestamp; the question time plus its latency is close. */
function answeredAt(askedAt: string, response: BotResponse) {
  return new Date(
    new Date(askedAt).getTime() + response.latencyMs,
  ).toISOString();
}

function Reply({
  name,
  avatar,
  time,
  agent = false,
  children,
}: {
  name: string;
  avatar: ReactNode;
  time?: string;
  agent?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={`Balasan ${name}`}
      className="flex max-w-[min(94%,680px)] items-start gap-2"
    >
      <span
        aria-hidden="true"
        className={
          agent
            ? "mt-5 grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background"
            : "mt-5 grid size-8 shrink-0 place-items-center rounded-full bg-signal-soft text-signal-text"
        }
      >
        {avatar}
      </span>
      <div className="grid min-w-0 gap-1">
        <h3 className="text-xs font-semibold text-muted-foreground">{name}</h3>
        <div
          className={
            agent
              ? "rounded-2xl rounded-tl-md border-2 border-foreground bg-card px-4 py-3"
              : "rounded-2xl rounded-tl-md border bg-card px-4 py-3"
          }
        >
          {children}
        </div>
        {time && (
          <p className="text-xs text-muted-foreground">{formatClock(time)}</p>
        )}
      </div>
    </section>
  );
}
