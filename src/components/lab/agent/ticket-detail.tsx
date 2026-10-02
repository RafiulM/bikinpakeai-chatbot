import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { LabConversation, SupportTicket } from "@/lib/lab/types";
import { formatScore } from "@/lib/lab/format";
import { TicketConversation } from "./ticket-conversation";
import { FrustrationTag, PriorityTag, StatusTag } from "./ticket-tags";

/** Everything an agent needs to pick up a ticket without reading the whole chat. */
export function TicketDetail({
  ticket,
  conversation,
  actions,
  notice,
  children,
}: {
  ticket: SupportTicket;
  /** The full conversation, when this session has it. */
  conversation?: LabConversation;
  /** Header buttons (claim, close, reopen). */
  actions?: ReactNode;
  notice?: ReactNode;
  /** Reply form. */
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="ticket-title"
      className="grid gap-5 rounded-[20px] border bg-card p-6 max-sm:p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-5">
        <div>
          <h2
            id="ticket-title"
            className="text-[22px] leading-tight font-medium tracking-tight"
          >
            {ticket.code} · {ticket.title}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <PriorityTag priority={ticket.priority} />
            <FrustrationTag score={ticket.frustrationScore} />
            <StatusTag status={ticket.status} claimedBy={ticket.claimedBy} />
            <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold">
              Percakapan {ticket.conversationCode}
            </span>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {notice}

      <div className="grid gap-6 md:grid-cols-2">
        <section
          aria-labelledby="ticket-summary"
          className="grid content-start gap-3"
        >
          <h3
            id="ticket-summary"
            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Ringkasan masalah · oleh Jev
          </h3>
          <ul className="grid list-disc gap-2 pl-5 text-[15px] leading-normal">
            {ticket.summaryPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="rounded-[10px] bg-surface-subtle px-4 py-3 text-sm leading-normal">
            <strong className="font-semibold">Langkah disarankan:</strong>{" "}
            {ticket.nextStep}
          </p>
        </section>
        <section
          aria-labelledby="ticket-context"
          className="grid content-start gap-3"
        >
          <h3
            id="ticket-context"
            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Konteks Jev
          </h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Produk</dt>
            <dd className="font-medium">{ticket.product}</dd>
            <dt className="text-muted-foreground">Jenis masalah</dt>
            <dd className="font-medium">{ticket.issueLabel}</dd>
            <dt className="text-muted-foreground">Frustrasi</dt>
            <dd
              className={cn(
                "font-medium tabular-nums",
                ticket.frustrationScore >= 0.75 && "text-danger-text",
              )}
            >
              {formatScore(ticket.frustrationScore)}
            </dd>
            <dt className="text-muted-foreground">Risiko churn</dt>
            <dd
              className={cn(
                "font-medium tabular-nums",
                ticket.churnRisk >= 0.7 && "text-danger-text",
              )}
            >
              {formatScore(ticket.churnRisk)}
            </dd>
            <dt className="text-muted-foreground">Alasan eskalasi</dt>
            <dd className="font-medium">{ticket.escalationReason}</dd>
            <dt className="text-muted-foreground">Analisis</dt>
            <dd>
              <Link
                to="/debug"
                className="font-medium underline underline-offset-3"
              >
                Lihat di Debug
              </Link>
            </dd>
          </dl>
        </section>
      </div>

      <TicketConversation ticket={ticket} conversation={conversation} />
      {children}
    </section>
  );
}
