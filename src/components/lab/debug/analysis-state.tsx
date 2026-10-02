import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConversationTurn } from "@/lib/lab/types";

/** Shown instead of the analysis while it is running or after it failed. */
export function AnalysisState({
  turn,
  onRetry,
}: {
  turn: ConversationTurn;
  onRetry?: () => void;
}) {
  if (turn.analysisStatus === "failed") {
    return (
      <div
        role="alert"
        className="grid gap-3 rounded-[10px] border border-danger/35 bg-danger/8 px-4 py-4"
      >
        <p className="flex items-center gap-2 text-[15px] font-semibold text-danger-text">
          <AlertTriangle className="size-5" aria-hidden="true" />
          Jev gagal membaca pesan ini
        </p>
        <p className="text-sm leading-relaxed">
          {turn.analysisError ??
            "Klasifikasi tidak selesai, jadi label, rute, dan alasan belum tersedia."}{" "}
          Pelanggan tetap mendapat jawaban dari jalur cadangan, dan hasil tanpa
          Jev tetap tercatat untuk perbandingan.
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="w-fit"
          >
            <RotateCcw aria-hidden="true" />
            Baca ulang dengan Jev
          </Button>
        )}
      </div>
    );
  }
  if (turn.analysisStatus === "pending") {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        Jev sedang membaca pesan ini…
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Pesan ini belum punya hasil analisis Jev. Hasilnya muncul begitu kedua
      jalur selesai memproses.
    </p>
  );
}

/** Reminds viewers that the baseline path has no labels or routing at all. */
export function WithoutJevNote({ turn }: { turn: ConversationTurn }) {
  return (
    <div className="grid gap-1 rounded-[10px] border border-dashed border-border-strong px-4 py-3 text-sm">
      <p className="font-semibold">Tanpa Jev: tidak ada pembacaan</p>
      <p className="text-muted-foreground">
        Jalur pembanding mengirim pesan langsung ke satu model mumpuni — tanpa
        label, tanpa aturan masking/blokir/eskalasi, dan tanpa verifikasi draf.
        {turn.withoutJev
          ? ` Jawabannya dinilai: ${turn.withoutJev.review.verdictLabel.toLowerCase()}.`
          : " Jawabannya belum tersedia."}
      </p>
    </div>
  );
}
