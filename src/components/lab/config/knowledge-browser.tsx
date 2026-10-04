import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SegmentedControl } from "@/components/lab/segmented-control";
import type { KnowledgeEntry } from "@/lib/lab/knowledge";
import { cn } from "@/lib/utils";
import { ConfigPanel } from "./config-panel";

const ALL = "Semua";
const number = (value: number) => value.toLocaleString("id-ID");

/** Rough token count of entries as they are sent (about 4 characters each). */
export function estimateTokens(entries: KnowledgeEntry[]) {
  const characters = entries.reduce(
    (sum, entry) =>
      sum + `- [${entry.product}] ${entry.topic}: ${entry.answer}\n`.length,
    0,
  );
  return Math.round(characters / 4);
}

function matches(entry: KnowledgeEntry, query: string) {
  if (!query) return true;
  return [entry.id, entry.product, entry.topic, entry.answer, ...entry.keywords]
    .join("\n")
    .toLowerCase()
    .includes(query);
}

/**
 * Every knowledge-base entry the agent answers from: a searchable list of
 * topics beside the open entry. Wide screens scroll the list on its own; on
 * narrow ones the open entry unfolds under its topic.
 */
export function KnowledgeBrowser({
  knowledge,
  docLimit,
  selectedId,
  onSelect,
}: {
  knowledge: KnowledgeEntry[];
  docLimit: number;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState(ALL);
  const q = query.trim().toLowerCase();

  const products = useMemo(
    () => [...new Set(knowledge.map((entry) => entry.product))],
    [knowledge],
  );
  const visible = knowledge.filter(
    (entry) =>
      (product === ALL || entry.product === product) && matches(entry, q),
  );
  const groups = products
    .map((name) => ({
      name,
      entries: visible.filter((entry) => entry.product === name),
    }))
    .filter((group) => group.entries.length > 0);
  // The entry named in the address, else the first one the filters keep.
  const selected =
    visible.find((entry) => entry.id === selectedId) ?? visible[0];

  // Bring an entry opened by link (e.g. from Debug) into view, once.
  const selectedRef = useRef<HTMLButtonElement>(null);
  const revealed = useRef(false);
  useEffect(() => {
    if (revealed.current) return;
    revealed.current = true;
    if (selectedId) selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <ConfigPanel
      description={`Pusat bantuan Bikinpakeai: ${knowledge.length} dokumen dari ${products.length} produk. Kedua jalur menjawab hanya dari dokumen ini.`}
      action={
        <Link
          to="/konfigurasi"
          search={(prev) => ({ ...prev, tab: "instruksi" })}
          replace
          resetScroll={false}
          className="text-sm font-semibold underline underline-offset-3"
        >
          Cara dokumen dipilih
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={searchId} className="sr-only">
          Cari dokumen
        </label>
        <div className="relative max-sm:w-full">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari topik, isi, atau kata kunci…"
            className="h-10 w-72 rounded-full border border-border-strong bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 max-sm:w-full"
          />
        </div>
        <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
          <SegmentedControl
            legend="Filter produk"
            value={product}
            onChange={setProduct}
            nowrap
            options={[ALL, ...products].map((name) => ({
              value: name,
              label: name,
              count:
                name === ALL
                  ? knowledge.length
                  : knowledge.filter((entry) => entry.product === name).length,
            }))}
          />
        </div>
      </div>

      <p role="status" className="sr-only">
        {visible.length} dokumen ditampilkan
      </p>
      {!selected ? (
        <p className="rounded-[12px] border border-dashed p-6 text-center text-sm text-muted-foreground">
          Tidak ada dokumen yang cocok dengan pencarian ini.
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <nav
            aria-label="Daftar dokumen"
            className="grid content-start gap-4 lg:h-[max(360px,calc(100dvh-21rem))] lg:overflow-y-auto lg:rounded-[12px] lg:border lg:p-2"
          >
            {groups.map((group) => (
              <section
                key={group.name}
                aria-label={`Dokumen ${group.name}`}
                className="grid gap-1"
              >
                <h3 className="px-3 pt-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.name} · {group.entries.length}
                </h3>
                <ul className="grid gap-0.5">
                  {group.entries.map((entry) => {
                    const current = entry.id === selected.id;
                    return (
                      <li key={entry.id} data-doc={entry.id}>
                        <button
                          ref={current ? selectedRef : undefined}
                          type="button"
                          aria-current={current || undefined}
                          onClick={() => onSelect(entry.id)}
                          className="grid w-full scroll-my-2 gap-0.5 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-muted aria-[current=true]:bg-canvas-warm aria-[current=true]:shadow-[inset_3px_0_0_var(--signal)]"
                        >
                          <span className="text-sm font-medium">
                            {entry.topic}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {entry.id}
                          </span>
                        </button>
                        {current && (
                          <div className="mx-1 mt-1 mb-2 rounded-[12px] border p-4 lg:hidden">
                            <DocumentDetail
                              entry={entry}
                              query={q}
                              docLimit={docLimit}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
          <article
            aria-label={`Dokumen ${selected.topic}`}
            data-doc-detail={selected.id}
            className="rounded-[12px] border p-6 max-lg:hidden"
          >
            <DocumentDetail entry={selected} query={q} docLimit={docLimit} />
          </article>
        </div>
      )}
    </ConfigPanel>
  );
}

function DocumentDetail({
  entry,
  query,
  docLimit,
}: {
  entry: KnowledgeEntry;
  query: string;
  docLimit: number;
}) {
  return (
    <div className="grid content-start gap-4">
      <div className="grid gap-1">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {entry.product}
        </span>
        <h3 className="text-[19px] leading-snug font-semibold">
          {entry.topic}
        </h3>
        <code className="font-mono text-xs break-all text-muted-foreground">
          {entry.id}
        </code>
      </div>
      <p className="text-[15px] leading-relaxed">{entry.answer}</p>
      <div className="grid gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Kata kunci
        </span>
        <ul className="flex flex-wrap gap-1.5">
          {entry.keywords.map((keyword) => (
            <li
              key={keyword}
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs",
                query && keyword.includes(query)
                  ? "border-signal/50 bg-signal-soft font-semibold text-signal-text"
                  : "text-foreground/80",
              )}
            >
              {keyword}
            </li>
          ))}
        </ul>
      </div>
      <p className="rounded-[10px] bg-surface-subtle p-3 text-xs text-foreground/80">
        Dengan Jev, dokumen ini ikut dikirim bila kata kuncinya cocok dengan
        pesan pelanggan (maks. {docLimit} dokumen teratas), atau bila tidak ada
        yang cocok dan Jev membaca produk {entry.product}. Tanpa Jev, dokumen
        ini selalu dikirim. Ukurannya ≈ {number(estimateTokens([entry]))} token.
      </p>
    </div>
  );
}
