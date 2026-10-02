import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { TicketDetail } from "@/components/lab/agent/ticket-detail";
import { TicketList } from "@/components/lab/agent/ticket-list";
import { mockTickets } from "@/lib/lab/mock-tickets";
import { sortTickets, type TicketSort } from "@/lib/lab/tickets";
import { SegmentedControl } from "@/components/lab/segmented-control";

export const Route = createFileRoute("/_protected/agent")({
  head: () => ({ meta: [{ title: `Agent | ${siteConfig.name}` }] }),
  component: AgentPage,
});

// Reference time for relative ages in the sample data, so server and browser
// render the same text.
const SAMPLE_NOW = Date.UTC(2026, 9, 1, 7, 11);

function AgentPage() {
  const [allTickets] = useState(mockTickets);
  const [sort, setSort] = useState<TicketSort>("urgency");
  const tickets = sortTickets(allTickets, sort);
  const [selectedId, setSelectedId] = useState(tickets[0]?.id);
  const selected =
    tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Antrean tiket yang dieskalasi Jev ke tim support manusia
          </p>
        </div>
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
      {!selected ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          Belum ada kasus yang dieskalasi.
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
              onSelect={setSelectedId}
              now={SAMPLE_NOW}
            />
          </section>
          <TicketDetail ticket={selected} />
        </div>
      )}
    </div>
  );
}
