import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { useLabConversation } from "@/components/lab/conversation-store";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { SessionCard } from "@/components/lab/sessions/session-card";
import { SessionOverview } from "@/components/lab/sessions/session-overview";
import {
  useSessionList,
  type SessionStatusFilter,
} from "@/components/lab/sessions/use-session-list";
import { dayKey, formatDay } from "@/lib/lab/format";
import type { ConversationListItem } from "@/lib/lab/types";

// Session history: every conversation is saved as it happens, so any of them
// can be reopened later to review how Jev read each message in Debug.
export const Route = createFileRoute("/_protected/riwayat")({
  head: () => ({ meta: [{ title: `Riwayat Sesi | ${siteConfig.name}` }] }),
  component: HistoryPage,
});

/** Conversations grouped by the day they started, newest day first. */
function byDay(items: ConversationListItem[]) {
  const groups: {
    key: string;
    label: string;
    items: ConversationListItem[];
  }[] = [];
  for (const item of items) {
    const key = dayKey(item.createdAt);
    const group = groups.at(-1);
    if (group?.key === key) group.items.push(item);
    else groups.push({ key, label: formatDay(item.createdAt), items: [item] });
  }
  return groups;
}

function HistoryPage() {
  const { conversation } = useLabConversation();
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SessionStatusFilter>("all");
  // Search once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const { items, hasMore, loading, error, reload, loadMore } = useSessionList({
    q,
    status,
  });
  const filtered = q !== "" || status !== "all";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Riwayat sesi
          </h1>
          <p className="text-sm text-muted-foreground">
            Setiap percakapan tersimpan otomatis, lengkap dengan cara Jev
            membacanya. Buka satu untuk mereview debug-nya.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="session-search" className="sr-only">
            Cari sesi
          </label>
          <div className="relative max-sm:w-full">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="session-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kode atau judul…"
              className="h-10 w-64 rounded-full border border-border-strong bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 max-sm:w-full"
            />
          </div>
          <SegmentedControl
            legend="Filter status sesi"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Semua" },
              { value: "active", label: "Aktif" },
              { value: "ended", label: "Selesai" },
            ]}
          />
        </div>
      </div>

      <SessionOverview q={q} status={status} />

      {error && (
        <p
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-danger/35 bg-danger/8 px-4 py-3 text-sm"
        >
          {error}
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Coba lagi
          </Button>
        </p>
      )}

      {items.length === 0 ? (
        <p
          role="status"
          className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground"
        >
          {loading
            ? "Memuat riwayat sesi…"
            : filtered
              ? "Tidak ada sesi yang cocok dengan pencarian ini."
              : "Belum ada sesi tersimpan. Mulai chat dulu; setiap percakapan otomatis muncul di sini."}
        </p>
      ) : (
        <div className="grid gap-6">
          {byDay(items).map((group) => (
            <section
              key={group.key}
              aria-labelledby={`sessions-${group.key}`}
              className="grid gap-2"
            >
              <h2
                id={`sessions-${group.key}`}
                className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                {group.label}
              </h2>
              <ul className="grid gap-2">
                {group.items.map((item) => (
                  <SessionCard
                    key={item.id}
                    session={item}
                    current={item.id === conversation.id}
                  />
                ))}
              </ul>
            </section>
          ))}
          {hasMore && (
            <Button
              variant="outline"
              className="justify-self-center"
              disabled={loading}
              onClick={() => void loadMore()}
            >
              {loading ? "Memuat…" : "Muat sesi lebih lama"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
