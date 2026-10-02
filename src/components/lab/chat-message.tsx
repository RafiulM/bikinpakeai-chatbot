import type { ReactNode } from "react";
import { Headset, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/lab/format";

const MASKED_CARD = /(\d{4} •••• •••• \d{4})/;

/** Renders masked card numbers as a distinct monospace token. */
export function MaskedText({ text }: { text: string }) {
  const parts = text.split(MASKED_CARD);
  return (
    <>
      {parts.map((part, index) =>
        MASKED_CARD.test(part) ? (
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

export function CustomerBubble({
  content,
  createdAt,
  isMasked,
}: {
  content: string;
  createdAt: string;
  isMasked: boolean;
}) {
  return (
    <li className="grid max-w-[min(78%,560px)] justify-items-end gap-1.5 self-end max-sm:max-w-[92%]">
      <p className="rounded-2xl rounded-br-md bg-foreground px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-background [overflow-wrap:anywhere]">
        <MaskedText text={content} />
      </p>
      {isMasked && (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden="true" />
          Nomor kartu disamarkan otomatis
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Kamu · {formatClock(createdAt)}
      </p>
    </li>
  );
}

export function BotBubble({
  content,
  createdAt,
  pending = false,
  footer,
}: {
  content: string;
  createdAt?: string;
  pending?: boolean;
  /** Extra links shown after the timestamp. */
  footer?: ReactNode;
}) {
  return (
    <li className="grid max-w-[min(78%,560px)] gap-1.5 self-start max-sm:max-w-[92%]">
      <p
        className={cn(
          "rounded-2xl rounded-bl-md border bg-surface-subtle px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]",
          pending && "text-muted-foreground italic",
        )}
      >
        {content}
      </p>
      {!pending && createdAt && (
        <p className="flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
          <span>Bikinpakeai · {formatClock(createdAt)}</span>
          {footer}
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
