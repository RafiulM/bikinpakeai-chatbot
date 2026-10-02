import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Highlighter } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useLabConversation } from "@/components/lab/conversation-store";
import { CompareRow } from "@/components/lab/compare-row";
import { CumulativeSummary } from "@/components/lab/cumulative-summary";
import { DeltaStrip } from "@/components/lab/delta-strip";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { Button } from "@/components/ui/button";
import { verdictsDiffer } from "@/lib/lab/compare";
import { sortTurns } from "@/lib/lab/conversation";

export const Route = createFileRoute("/_protected/compare")({
  head: () => ({ meta: [{ title: `Compare | ${siteConfig.name}` }] }),
  component: ComparePage,
});

function ComparePage() {
  const { conversation } = useLabConversation();
  const turns = sortTurns(conversation.turns);
  const [highlight, setHighlight] = useState(true);
  const [filter, setFilter] = useState<"all" | "differs">("all");
  const differing = turns.filter(verdictsDiffer);
  const shown = filter === "all" ? turns : differing;

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Compare
          </h1>
          <p className="text-sm text-muted-foreground">
            Percakapan {conversation.code} · jawaban dengan dan tanpa Jev untuk
            pesan yang sama
          </p>
        </div>
        <Button
          variant="outline"
          aria-pressed={highlight}
          onClick={() => setHighlight((on) => !on)}
          className="aria-pressed:border-foreground aria-pressed:bg-canvas-warm"
        >
          <Highlighter aria-hidden="true" />
          Sorot perbedaan
        </Button>
      </div>
      <CumulativeSummary turns={turns} code={conversation.code} />
      {turns.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          Belum ada pesan. Kirim pertanyaan di tampilan Customer untuk melihat
          dua jawabannya di sini.
        </p>
      ) : (
        <section aria-labelledby="compare-rows-title" className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="compare-rows-title"
              className="text-[22px] font-medium tracking-tight"
            >
              Jawaban berdampingan
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                legend="Tampilkan pesan"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "Semua pesan" },
                  { value: "differs", label: "Hasil berbeda" },
                ]}
              />
              <p role="status" className="text-sm text-muted-foreground">
                Menampilkan {shown.length} dari {turns.length} pesan
              </p>
            </div>
          </div>
          {shown.map((turn) => (
            <CompareRow
              key={turn.message.id}
              turn={turn}
              index={turns.indexOf(turn)}
              highlight={highlight}
              footer={<DeltaStrip turn={turn} />}
            />
          ))}
          {shown.length === 0 && (
            <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
              Belum ada pesan dengan hasil berbeda. Pilih “Semua pesan” untuk
              melihat semuanya.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
