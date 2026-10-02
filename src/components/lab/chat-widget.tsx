import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowDown, ShieldCheck } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { sortTurns } from "@/lib/lab/conversation";
import { dayKey, formatDay } from "@/lib/lab/format";
import type { ConversationTurn } from "@/lib/lab/types";
import {
  AgentBubble,
  BotBubble,
  CustomerBubble,
  EscalationEvent,
  TypingBubble,
} from "./chat-message";

/**
 * Customer-facing support widget. Shows the conversation exactly as the
 * customer sees it: their messages and the answers produced with Jev.
 */
export function ChatWidget({
  turns,
  banner,
  pendingReply,
  greeting,
  renderBotFooter,
  onRetry,
  composer,
}: {
  turns: ConversationTurn[];
  banner?: ReactNode;
  /** Shown as a typing bubble while a reply is on its way. */
  pendingReply?: boolean;
  /** Opening line for an empty conversation. */
  greeting?: string;
  renderBotFooter?: (turn: ConversationTurn) => ReactNode;
  /** Resend a message whose delivery failed. */
  onRetry?: (turn: ConversationTurn) => void;
  composer: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [hasNew, setHasNew] = useState(false);
  const reduceMotion = useReducedMotion();
  const ordered = useMemo(() => sortTurns(turns), [turns]);
  const last = ordered.at(-1);
  // Changes whenever something new lands at the end of the conversation.
  const tailKey = [
    last?.message.id,
    last?.withJev?.id,
    last?.agentReplies?.length,
    pendingReply,
  ].join("|");

  function scrollToEnd(smooth: boolean) {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: smooth && !reduceMotion ? "smooth" : "auto",
    });
    atBottomRef.current = true;
    setHasNew(false);
  }

  // Start at the latest message, like any chat app.
  useLayoutEffect(() => {
    scrollToEnd(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow new messages only when the reader is already at the bottom or just
  // sent something. Otherwise keep their place and offer a jump button.
  useEffect(() => {
    if (atBottomRef.current || last?.deliveryStatus === "sending") {
      scrollToEnd(true);
    } else {
      setHasNew(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailKey]);

  function handleScroll() {
    const node = scrollRef.current;
    if (!node) return;
    const atBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    atBottomRef.current = atBottom;
    if (atBottom) setHasNew(false);
  }

  return (
    <section
      aria-labelledby="chat-widget-title"
      className="flex h-[min(820px,calc(100dvh-180px))] min-h-[560px] flex-col overflow-hidden rounded-[20px] border bg-card max-md:h-auto max-md:min-h-0"
    >
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2
            id="chat-widget-title"
            className="text-[17px] leading-tight font-semibold"
          >
            Bantuan Bikinpakeai
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            PRDTask, DesainPakeAI, AndalAI, Template, membership, dan komunitas.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground/80">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Dengan Jev
        </span>
      </header>
      {banner}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto p-5 max-md:max-h-[70vh] max-sm:p-4"
        >
          <ol
            role="log"
            aria-label="Riwayat percakapan"
            className="flex flex-col gap-4"
          >
            {ordered.length === 0 && greeting && (
              <BotBubble content={greeting} />
            )}
            {ordered.map((turn, index) => {
              const day = dayKey(turn.message.createdAt);
              const newDay =
                index === 0 ||
                day !== dayKey(ordered[index - 1].message.createdAt);
              return (
                <Fragment key={turn.message.id}>
                  {newDay && <DaySeparator iso={turn.message.createdAt} />}
                  <TurnBubbles
                    turn={turn}
                    footer={renderBotFooter?.(turn)}
                    onRetry={onRetry ? () => onRetry(turn) : undefined}
                  />
                </Fragment>
              );
            })}
            {pendingReply && <TypingBubble />}
          </ol>
        </div>
        {hasNew && (
          <button
            type="button"
            onClick={() => scrollToEnd(true)}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-sm font-medium text-background shadow-[0_0_14px_rgb(0_0_0/7%)]"
          >
            <ArrowDown className="size-4" aria-hidden="true" />
            Pesan baru
          </button>
        )}
      </div>
      <p role="status" className="sr-only">
        {pendingReply ? "Menunggu jawaban…" : ""}
      </p>
      <div className="grid gap-3 border-t px-5 pt-3 pb-4 max-sm:px-4">
        {composer}
      </div>
    </section>
  );
}

function DaySeparator({ iso }: { iso: string }) {
  return (
    <li className="flex items-center gap-3 text-xs font-semibold text-muted-foreground before:flex-1 before:border-t after:flex-1 after:border-t">
      <span>{formatDay(iso)}</span>
    </li>
  );
}

function TurnBubbles({
  turn,
  footer,
  onRetry,
}: {
  turn: ConversationTurn;
  footer?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <>
      <CustomerBubble
        content={turn.message.content}
        createdAt={turn.message.createdAt}
        isMasked={turn.message.isMasked}
        status={turn.deliveryStatus ?? "sent"}
        onRetry={onRetry}
      />
      {turn.withJev && (
        <BotBubble
          content={turn.withJev.content}
          createdAt={turn.message.createdAt}
          footer={footer}
        />
      )}
      {turn.ticketId && <EscalationEvent ticketId={turn.ticketId} />}
      {turn.agentReplies?.map((reply) => (
        <AgentBubble
          key={reply.id}
          agentName={reply.agentName}
          content={reply.content}
          createdAt={reply.createdAt}
        />
      ))}
    </>
  );
}
