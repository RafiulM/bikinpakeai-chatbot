import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, FileDown, Video } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useLabConversation } from "@/components/lab/conversation-store";
import { CopyTranscript } from "@/components/lab/export/copy-transcript";
import { ExportSection } from "@/components/lab/export/export-section";
import { RecordingToggle } from "@/components/lab/export/recording-toggle";
import { SourceSummary } from "@/components/lab/export/source-summary";
import { labApi } from "@/lib/lab/api-client";
import { summarize } from "@/lib/lab/compare";
import type { TestRunState } from "@/lib/lab/types";

export const Route = createFileRoute("/_protected/ekspor")({
  head: () => ({ meta: [{ title: `Ekspor & Rekap | ${siteConfig.name}` }] }),
  component: ExportPage,
});

function ExportPage() {
  const { conversation } = useLabConversation();
  const [lastRun, setLastRun] = useState<TestRunState | null>(null);
  const [loadingRun, setLoadingRun] = useState(true);

  useEffect(() => {
    let active = true;
    labApi
      .listTestRuns("done")
      .then(([run]) => {
        if (active) setLastRun(run ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingRun(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div>
        <h1 className="text-[22px] leading-tight font-medium tracking-tight">
          Ekspor & Rekap
        </h1>
        <p className="text-sm text-muted-foreground">
          Simpan dan bagikan hasil perbandingan sebagai bahan video atau laporan
        </p>
      </div>
      <SourceSummary
        conversation={{
          code: conversation.code,
          title: conversation.title,
          messageCount: conversation.turns.length,
          summary: summarize(conversation.turns),
        }}
        lastRun={lastRun}
        loadingRun={loadingRun}
      />
      <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ExportSection
          id="export-summary"
          icon={FileDown}
          title="Unduh ringkasan"
          description="Hasil perbandingan percakapan dan uji test set dalam satu berkas ringkas."
        >
          <ul className="grid list-disc gap-1 pl-5 text-sm marker:text-muted-foreground">
            <li>Skor, waktu, dan biaya dengan dan tanpa Jev</li>
            <li>Total kumulatif percakapan aktif</li>
            <li>Laporan uji test set terakhir per kategori</li>
          </ul>
        </ExportSection>
        <ExportSection
          id="export-transcript"
          icon={ClipboardCopy}
          title="Salin transkrip"
          description="Percakapan beserta label Jev untuk ditempel di dokumen atau chat lain."
        >
          <ul className="grid list-disc gap-1 pl-5 text-sm marker:text-muted-foreground">
            <li>Pesan pelanggan dan kedua jawaban</li>
            <li>Label Jev, rute, dan alasan keputusan</li>
            <li>Data sensitif tetap tersamarkan</li>
          </ul>
          <CopyTranscript conversation={conversation} />
        </ExportSection>
        <ExportSection
          id="export-recording"
          icon={Video}
          title="Mode tampilan rekaman"
          description="Tampilan bersih tanpa elemen pengganggu supaya enak direkam untuk video."
        >
          <ul className="grid list-disc gap-1 pl-5 text-sm marker:text-muted-foreground">
            <li>Navigasi dan detail teknis disembunyikan</li>
            <li>Teks dan angka diperbesar</li>
            <li>Tekan Esc untuk keluar kapan saja</li>
          </ul>
          <RecordingToggle />
        </ExportSection>
      </div>
    </div>
  );
}
