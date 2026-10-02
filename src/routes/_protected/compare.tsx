import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Highlighter } from "lucide-react";
import { siteConfig } from "@/config/site";
import { CompareRow } from "@/components/lab/compare-row";
import { DeltaStrip } from "@/components/lab/delta-strip";
import { Button } from "@/components/ui/button";
import { sortTurns } from "@/lib/lab/conversation";
import { mockConversation } from "@/lib/lab/mock-data";

export const Route = createFileRoute("/_protected/compare")({
  head: () => ({ meta: [{ title: `Compare | ${siteConfig.name}` }] }),
  component: ComparePage,
});

function ComparePage() {
  const turns = sortTurns(mockConversation.turns);
  const [highlight, setHighlight] = useState(true);

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Compare
          </h1>
          <p className="text-sm text-muted-foreground">
            Percakapan {mockConversation.code} · jawaban dengan dan tanpa Jev
            untuk pesan yang sama
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
      {turns.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          Belum ada pesan. Kirim pertanyaan di tampilan Customer untuk melihat
          dua jawabannya di sini.
        </p>
      ) : (
        <section aria-label="Jawaban berdampingan" className="grid gap-5">
          {turns.map((turn, index) => (
            <CompareRow
              key={turn.message.id}
              turn={turn}
              index={index}
              highlight={highlight}
              footer={<DeltaStrip turn={turn} />}
            />
          ))}
        </section>
      )}
    </div>
  );
}
