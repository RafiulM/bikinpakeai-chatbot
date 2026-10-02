import { useEffect, useId, useState } from "react";
import { Check, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { labApi } from "@/lib/lab/api-client";
import type { SummaryFormat } from "@/lib/lab/summary-export";
import type { LabConversation, TestRunReport } from "@/lib/lab/types";

/** Saves the comparison results as one Markdown or JSON file. */
export function DownloadSummary({
  conversation,
  report,
  onSaved,
}: {
  conversation: Pick<LabConversation, "id" | "code" | "turns">;
  report: TestRunReport | null;
  /** Called with the file name once the download has started. */
  onSaved?: (fileName: string) => void;
}) {
  const id = useId();
  const [format, setFormat] = useState<SummaryFormat>("markdown");
  const [withConversation, setWithConversation] = useState(true);
  const [withReport, setWithReport] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);
  const hasConversation = conversation.turns.length > 0;
  const includeConversation = withConversation && hasConversation;
  const includeReport = withReport && report !== null;
  const ready = includeConversation || includeReport;

  // Built on the server from stored results, then saved by the browser.
  async function download() {
    setSaving(true);
    setError(null);
    try {
      const file = await labApi.exportSummary({
        conversationId: includeConversation ? conversation.id : undefined,
        testRunId: includeReport ? report.runId : undefined,
        format,
      });
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaved(true);
      onSaved?.(file.fileName);
    } catch {
      setError("Ringkasan gagal dibuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <fieldset className="m-0 grid gap-1 border-0 p-0 text-sm">
        <legend className="mb-1 font-semibold">Isi berkas</legend>
        <label htmlFor={`${id}-conv`} className="flex items-start gap-2">
          <input
            id={`${id}-conv`}
            type="checkbox"
            checked={includeConversation}
            disabled={!hasConversation}
            onChange={(event) => setWithConversation(event.target.checked)}
            className="mt-0.5 size-4 accent-foreground"
          />
          <span>
            Percakapan aktif {conversation.code}
            {!hasConversation && (
              <span className="text-muted-foreground"> · belum ada pesan</span>
            )}
          </span>
        </label>
        <label htmlFor={`${id}-run`} className="flex items-start gap-2">
          <input
            id={`${id}-run`}
            type="checkbox"
            checked={includeReport}
            disabled={!report}
            onChange={(event) => setWithReport(event.target.checked)}
            className="mt-0.5 size-4 accent-foreground"
          />
          <span>
            {report
              ? `Uji test set Run #${report.runNumber} · ${report.testSetName}`
              : "Uji test set"}
            {!report && (
              <span className="text-muted-foreground">
                {" "}
                · belum ada uji yang selesai
              </span>
            )}
          </span>
        </label>
      </fieldset>
      <SegmentedControl
        legend="Format berkas"
        value={format}
        onChange={setFormat}
        options={[
          { value: "markdown", label: "Markdown" },
          { value: "json", label: "JSON" },
        ]}
      />
      <Button
        onClick={() => void download()}
        disabled={!ready || saving}
        className="w-fit"
      >
        {saved ? <Check aria-hidden="true" /> : <FileDown aria-hidden="true" />}
        {saving ? "Menyiapkan…" : saved ? "Tersimpan" : "Unduh ringkasan"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}
      {!ready && (
        <p className="text-sm text-muted-foreground">
          Pilih minimal satu isi yang tersedia.
        </p>
      )}
    </div>
  );
}
