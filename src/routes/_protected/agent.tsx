import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { TicketDetail } from "@/components/lab/agent/ticket-detail";
import { STATUS_LABEL } from "@/components/lab/agent/ticket-tags";
import { TicketList } from "@/components/lab/agent/ticket-list";
import { sortTickets, type TicketSort } from "@/lib/lab/tickets";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { AGENT_NAME, useTickets } from "@/components/lab/ticket-store";
import { ReplyForm } from "@/components/lab/agent/reply-form";
import { TicketActions } from "@/components/lab/agent/ticket-actions";
import { useLabConversation } from "@/components/lab/conversation-store";
import type { TicketStatus } from "@/lib/lab/types";

export const Route = createFileRoute("/_protected/agent")({
  head: () => ({ meta: [{ title: `Agent | ${siteConfig.name}` }] }),
  component: AgentPage,
});

// Reference time for relative ages in the sample data, so server and browser
// render the same text.
const SAMPLE_NOW = Date.UTC(2026, 9, 1, 7, 11);

function AgentPage() {
  const {
    tickets: allTickets,
    counts,
    claim,
    close,
    reopen,
    reply,
  } = useTickets();
  const [notice, setNotice] = useState<string | null>(null);
  const { conversations } = useLabConversation();
  const [sort, setSort] = useState<TicketSort>("urgency");
  const [status, setStatus] = useState<TicketStatus>("open");
  const tickets = sortTickets(
    allTickets.filter((ticket) => ticket.status === status),
    sort,
  );
  const [selectedId, setSelectedId] = useState(tickets[0]?.id);
  // A ticket stays open in the detail panel after it leaves the current
  // filter (e.g. right after closing it), so it can be reopened at once.
  const selected =
    allTickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];

  function select(id: string) {
    setSelectedId(id);
    setNotice(null);
  }

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground tabular-nums">
              {counts.open + counts.claimed} tiket aktif
            </strong>{" "}
            · {counts.open} terbuka, {counts.claimed} sedang ditangani
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            legend="Filter status tiket"
            value={status}
            onChange={setStatus}
            options={[
              { value: "open", label: "Terbuka", count: counts.open },
              { value: "claimed", label: "Diklaim", count: counts.claimed },
              { value: "closed", label: "Ditutup", count: counts.closed },
            ]}
          />
          <SegmentedControl
            legend="Urutkan tiket"
            value={sort}
            onChange={setSort}
            options={[
              { value: "urgency", label: "Paling mendesak" },
              { value: "frustration", label: "Paling kesal" },
              { value: "waiting", label: "Terlama menunggu" },
            ]}
          />
        </div>
      </div>
      {!selected ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          {allTickets.length === 0
            ? "Belum ada kasus yang dieskalasi."
            : `Tidak ada tiket berstatus ${STATUS_LABEL[status].toLowerCase()}.`}
        </p>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section
            aria-labelledby="ticket-queue-title"
            className="grid gap-2 rounded-[20px] border bg-card p-3"
          >
            <h2 id="ticket-queue-title" className="sr-only">
              Daftar tiket
            </h2>
            <TicketList
              tickets={tickets}
              selectedId={selected.id}
              onSelect={select}
              now={SAMPLE_NOW}
            />
          </section>
          <TicketDetail
            ticket={selected}
            conversation={conversations.find(
              (conversation) => conversation.id === selected.conversationId,
            )}
            notice={
              notice && (
                <p
                  role="status"
                  className="rounded-[10px] border border-signal bg-signal-soft px-4 py-2.5 text-sm"
                >
                  {notice}
                </p>
              )
            }
            actions={
              <TicketActions
                ticket={selected}
                onClaim={() => {
                  claim(selected.id, AGENT_NAME);
                  setNotice(
                    `${selected.code} kamu klaim dan pindah ke tab Diklaim.`,
                  );
                }}
                onClose={() => {
                  close(selected.id);
                  setNotice(
                    `${selected.code} ditutup dan pindah ke tab Ditutup.`,
                  );
                }}
                onReopen={() => {
                  reopen(selected.id);
                  setNotice(`${selected.code} dibuka lagi.`);
                }}
              />
            }
          >
            <ReplyForm
              disabled={selected.status === "closed"}
              onSend={(content, closeAfter) => {
                reply(selected.id, content, AGENT_NAME);
                if (closeAfter) close(selected.id);
                setNotice(
                  closeAfter
                    ? `Balasan terkirim dan ${selected.code} ditutup.`
                    : "Balasan terkirim ke pelanggan.",
                );
              }}
            />
          </TicketDetail>
        </div>
      )}
    </div>
  );
}
