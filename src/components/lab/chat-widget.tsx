import { useEffect, useRef, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import type { ConversationTurn } from "@/lib/lab/types";
import { BotBubble, CustomerBubble, EscalationEvent } from "./chat-message";

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
  composer,
}: {
  turns: ConversationTurn[];
  banner?: ReactNode;
  /** Shown as a typing bubble while a reply is on its way. */
  pendingReply?: boolean;
  /** Opening line for an empty conversation. */
  greeting?: string;
  renderBotFooter?: (turn: ConversationTurn) => ReactNode;
  composer: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastId = turns.at(-1)?.withJev?.id ?? turns.at(-1)?.message.id;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lastId, pendingReply, turns.length]);

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
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-5 max-md:max-h-[70vh] max-sm:p-4"
      >
        <ol
          role="log"
          aria-label="Riwayat percakapan"
          className="flex flex-col gap-4"
        >
          {turns.length === 0 && greeting && <BotBubble content={greeting} />}
          {turns.map((turn) => (
            <TurnBubbles
              key={turn.message.id}
              turn={turn}
              footer={renderBotFooter?.(turn)}
            />
          ))}
          {pendingReply && (
            <BotBubble content="Bikinpakeai sedang mengetik…" pending />
          )}
        </ol>
      </div>
      <div className="grid gap-3 border-t px-5 pt-3 pb-4 max-sm:px-4">
        {composer}
      </div>
    </section>
  );
}

function TurnBubbles({
  turn,
  footer,
}: {
  turn: ConversationTurn;
  footer?: ReactNode;
}) {
  return (
    <>
      <CustomerBubble
        content={turn.message.content}
        createdAt={turn.message.createdAt}
        isMasked={turn.message.isMasked}
      />
      {turn.withJev && (
        <BotBubble
          content={turn.withJev.content}
          createdAt={turn.message.createdAt}
          footer={footer}
        />
      )}
      {turn.ticketId && <EscalationEvent ticketId={turn.ticketId} />}
    </>
  );
}
