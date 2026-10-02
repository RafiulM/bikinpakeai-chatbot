import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { AlertCircle, Headset, Lock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/lab/format";

const MASKED_CARD = /(\d{4} •••• •••• \d{4})/;

/** Renders masked card numbers as a distinct monospace token. */
export function MaskedText({ text }: { text: string }) {
  const parts = text.split(MASKED_CARD);
  return (
    <>
      {parts.map((part, index) =>
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
      )}
    </>
  );
}

type BubbleVariant = "customer" | "bot" | "agent";
export type DeliveryStatus = "sent" | "sending" | "failed";

const SPEAKER: Record<BubbleVariant, string> = {
  customer: "Kamu",
  bot: "Bikinpakeai",
  agent: "Tim Support",
};

const BUBBLE_STYLE: Record<BubbleVariant, string> = {
  customer: "rounded-br-md bg-foreground text-background",
  bot: "rounded-bl-md border bg-surface-subtle",
  agent: "rounded-bl-md border-2 border-foreground bg-card",
};

/**
 * One chat bubble. Customer messages sit on the right; bot and human-agent
 * replies sit on the left. The speaker name is always written out so the
 * role is never conveyed by position or color alone.
 */
function Bubble({
  variant,
  speaker = SPEAKER[variant],
  createdAt,
  status = "sent",
  note,
  footer,
  onRetry,
  children,
}: {
  variant: BubbleVariant;
  speaker?: string;
  createdAt?: string;
  status?: DeliveryStatus;
  note?: ReactNode;
  footer?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}) {
  const mine = variant === "customer";
  return (
    <li
      className={cn(
        "grid max-w-[min(78%,560px)] gap-1.5 max-sm:max-w-[92%]",
        mine ? "justify-items-end self-end" : "self-start",
      )}
    >
      <p
        className={cn(
          "rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]",
          BUBBLE_STYLE[variant],
          status === "sending" && "opacity-70",
        )}
      >
        <span className="sr-only">{speaker}: </span>
        {children}
      </p>
      {note}
      {status === "failed" ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-danger-text">
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
        <p className="flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
          <span aria-hidden="true">
            {speaker}
            {createdAt && ` · ${formatClock(createdAt)}`}
          </span>
          {status === "sending" && <span>Mengirim…</span>}
          {footer}
        </p>
      )}
    </li>
  );
}

export function CustomerBubble({
  content,
  createdAt,
  isMasked,
  status,
  onRetry,
}: {
  content: string;
  createdAt: string;
  isMasked: boolean;
  status?: DeliveryStatus;
  onRetry?: () => void;
}) {
  return (
    <Bubble
      variant="customer"
      createdAt={createdAt}
      status={status}
      onRetry={onRetry}
      note={
        isMasked && (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" />
            Nomor kartu disamarkan otomatis
          </p>
        )
      }
    >
      <MaskedText text={content} />
    </Bubble>
  );
}

export function BotBubble({
  content,
  createdAt,
  footer,
}: {
  content: string;
  createdAt?: string;
  /** Extra links shown after the timestamp. */
  footer?: ReactNode;
}) {
  return (
    <Bubble variant="bot" createdAt={createdAt} footer={footer}>
      {content}
    </Bubble>
  );
}

export function AgentBubble({
  content,
  createdAt,
  agentName,
}: {
  content: string;
  createdAt: string;
  agentName: string;
}) {
  return (
    <Bubble
      variant="agent"
      speaker={`${agentName} · Tim Support`}
      createdAt={createdAt}
    >
      {content}
    </Bubble>
  );
}

/** Shown while both answer paths are still being prepared. */
export function TypingBubble() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      500,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <li className="grid gap-1.5 self-start">
      <p className="inline-flex items-center gap-3 rounded-2xl rounded-bl-md border bg-surface-subtle px-4 py-3 text-[15px] text-muted-foreground">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
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
        </span>
        Bikinpakeai sedang mengetik
      </p>
      {seconds >= 3 && (
        <p className="text-xs text-muted-foreground">
          Masih memproses · {seconds} dtk. Jev dan pembanding berjalan
          bersamaan.
        </p>
      )}
    </li>
  );
}

export function EscalationEvent({ ticketId }: { ticketId: string }) {
  return (
    <li className="flex items-center gap-3 text-xs font-semibold text-muted-foreground before:flex-1 before:border-t after:flex-1 after:border-t">
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-foreground/80">
        <Headset className="size-3.5" aria-hidden="true" />
        Diteruskan ke tim support · Tiket {ticketId}
      </span>
    </li>
  );
}
