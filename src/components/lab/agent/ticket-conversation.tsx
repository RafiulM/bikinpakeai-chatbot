import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LabConversation,
  SupportTicket,
  TicketExcerptLine,
} from "@/lib/lab/types";
import { formatClock } from "@/lib/lab/format";
import { sortTurns } from "@/lib/lab/conversation";

function Line({
  label,
  content,
  createdAt,
  from,
  masked,
}: {
  label: string;
  content: string;
  createdAt: string;
  from: TicketExcerptLine["sender"];
  masked?: boolean;
}) {
  return (
    <li
      className={cn(
        "grid gap-0.5 rounded-[10px] px-3 py-2.5 text-sm leading-normal [overflow-wrap:anywhere]",
        from === "agent"
          ? "border bg-card"
          : from === "bot"
            ? "bg-surface-subtle"
            : "bg-muted",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {label} · {formatClock(createdAt)}
        {masked && (
          <span className="inline-flex items-center gap-1 font-normal">
            <Lock className="size-3" aria-hidden="true" /> disamarkan
          </span>
        )}
      </span>
      {content}
    </li>
  );
}

/**
 * The conversation behind a ticket: Jev's excerpt by default, the whole
 * conversation on demand when it is available, then the agent replies.
 */
export function TicketConversation({
  ticket,
  conversation,
}: {
  ticket: SupportTicket;
  conversation: LabConversation | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const turns = conversation ? sortTurns(conversation.turns) : [];

  return (
    <section aria-labelledby="ticket-thread" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="ticket-thread"
          className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Percakapan & balasan
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {conversation && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="ticket-thread-list"
              onClick={() => setExpanded((open) => !open)}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-3"
            >
              {expanded ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
              {expanded
                ? "Tampilkan cuplikan saja"
                : `Seluruh percakapan (${turns.length} pesan)`}
            </button>
          )}
          {conversation && (
            <Link
              to="/customer"
              search={(prev) => ({ ...prev, c: ticket.conversationId })}
              className="font-semibold underline underline-offset-3"
            >
              Buka di Customer
            </Link>
          )}
        </div>
      </div>
      <ol id="ticket-thread-list" className="grid gap-2">
        {expanded && conversation
          ? turns.flatMap((turn) => [
              <Line
                key={turn.message.id}
                from="customer"
                label="Pelanggan"
                content={turn.message.content}
                createdAt={turn.message.createdAt}
                masked={turn.message.isMasked}
              />,
              ...(turn.withJev
                ? [
                    <Line
                      key={`${turn.message.id}-jev`}
                      from="bot"
                      label="Bot dengan Jev"
                      content={turn.withJev.content}
                      createdAt={turn.message.createdAt}
                    />,
                  ]
                : []),
            ])
          : ticket.excerpt.map((line, index) => (
              <Line
                key={index}
                from={line.sender}
                label={line.label}
                content={line.content}
                createdAt={line.createdAt}
              />
            ))}
        {ticket.replies.map((reply) => (
          <Line
            key={reply.id}
            from="agent"
            label={reply.agentName}
            content={reply.content}
            createdAt={reply.createdAt}
          />
        ))}
      </ol>
      {!conversation && (
        <p className="text-xs text-muted-foreground">
          Cuplikan dirangkum Jev. Percakapan lengkap {ticket.conversationCode}{" "}
          tidak ada di sesi ini.
        </p>
      )}
    </section>
  );
}
