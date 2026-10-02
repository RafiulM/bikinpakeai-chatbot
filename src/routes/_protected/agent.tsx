import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { TicketDetail } from "@/components/lab/agent/ticket-detail";
import { TicketList } from "@/components/lab/agent/ticket-list";
import {
  filterTickets,
  sortTickets,
  type TicketFilter,
  type TicketSort,
} from "@/lib/lab/tickets";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { useTickets } from "@/components/lab/ticket-store";
import { ReplyForm } from "@/components/lab/agent/reply-form";
import { TicketActions } from "@/components/lab/agent/ticket-actions";
import { useLabConversation } from "@/components/lab/conversation-store";

export const Route = createFileRoute("/_protected/agent")({
  head: () => ({ meta: [{ title: `Agent | ${siteConfig.name}` }] }),
  component: AgentPage,
});

function AgentPage() {
  const {
    tickets: allTickets,
    counts,
    loading,
    error,
    refresh,
    claim,
    close,
    reopen,
    reply,
  } = useTickets();
  // Opening the queue always shows the latest tickets.
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  // Reference time for "x minutes ago", refreshed every minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const [notice, setNotice] = useState<string | null>(null);
  const { conversations } = useLabConversation();
  const [sort, setSort] = useState<TicketSort>("urgency");
  const [filter, setFilter] = useState<TicketFilter>("active");
  const [query, setQuery] = useState("");
  const tickets = sortTickets(filterTickets(allTickets, filter, query), sort);
  const filtered = filter !== "active" || query.trim() !== "";
  const [selectedId, setSelectedId] = useState(tickets[0]?.id);
  // A ticket stays open in the detail panel after it leaves the current
  // filter (e.g. right after closing it), so it can be reopened at once.
  const selected =
    allTickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];

  /** Runs a ticket action and reports the outcome in the notice area. */
  async function act(action: () => Promise<void>, success: string) {
    try {
      await action();
      setNotice(success);
    } catch {
      setNotice("Aksi gagal. Muat ulang antrean lalu coba lagi.");
    }
  }

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
            value={filter}
            onChange={setFilter}
            options={[
              {
                value: "active",
                label: "Aktif",
                count: counts.open + counts.claimed,
              },
              { value: "done", label: "Selesai", count: counts.closed },
              { value: "all", label: "Semua", count: allTickets.length },
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
      {error && (
        <p
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-danger/35 bg-danger/8 px-4 py-3 text-sm"
        >
          {error}
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Coba lagi
          </Button>
        </p>
      )}
      {allTickets.length === 0 ? (
        <p
          role="status"
          className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground"
        >
          {loading
            ? "Memuat antrean tiket…"
            : "Belum ada kasus yang dieskalasi. Tiket muncul otomatis saat Jev meneruskan percakapan ke tim support."}
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
            <div className="grid gap-2 px-1 pt-1">
              <label htmlFor="ticket-search" className="sr-only">
                Cari tiket
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="ticket-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari kode, produk, atau masalah…"
                  className="h-10 w-full rounded-full border border-border-strong bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <p role="status">
                  {tickets.length} dari {allTickets.length} tiket
                </p>
                {filtered && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setFilter("active");
                      setQuery("");
                    }}
                  >
                    <X aria-hidden="true" />
                    Reset filter
                  </Button>
                )}
              </div>
            </div>
            {tickets.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tidak ada tiket yang cocok dengan filter ini.
              </p>
            )}
            <TicketList
              tickets={tickets}
              selectedId={selected.id}
              onSelect={select}
              now={now}
            />
          </section>
          {!selected ? (
            <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
              Pilih tiket dari antrean untuk melihat detailnya.
            </p>
          ) : (
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
                  onClaim={() =>
                    act(
                      () => claim(selected.id),
                      `${selected.code} kamu klaim dan pindah ke tab Diklaim.`,
                    )
                  }
                  onClose={() =>
                    act(
                      () => close(selected.id),
                      `${selected.code} ditutup dan pindah ke Selesai.`,
                    )
                  }
                  onReopen={() =>
                    act(
                      () => reopen(selected.id),
                      `${selected.code} dibuka lagi.`,
                    )
                  }
                />
              }
            >
              <ReplyForm
                disabled={selected.status === "closed"}
                onSend={(content, closeAfter) =>
                  act(
                    () => reply(selected.id, content, closeAfter),
                    closeAfter
                      ? `Balasan terkirim dan ${selected.code} ditutup.`
                      : "Balasan terkirim ke pelanggan.",
                  )
                }
              />
            </TicketDetail>
          )}
        </div>
      )}
    </div>
  );
}
