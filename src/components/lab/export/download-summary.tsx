import { useId, useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { buildSummaryFile, type SummaryFormat } from "@/lib/lab/summary-export";
import type { LabConversation, TestRunReport } from "@/lib/lab/types";

/** Saves the comparison results as one Markdown or JSON file. */
export function DownloadSummary({
  conversation,
  report,
}: {
  conversation: Pick<LabConversation, "code" | "title" | "turns">;
  report: TestRunReport | null;
}) {
  const id = useId();
  const [format, setFormat] = useState<SummaryFormat>("markdown");
  const [withConversation, setWithConversation] = useState(true);
  const [withReport, setWithReport] = useState(true);
  const [status, setStatus] = useState("");
  const hasConversation = conversation.turns.length > 0;
  const includeConversation = withConversation && hasConversation;
  const includeReport = withReport && report !== null;
  const ready = includeConversation || includeReport;

  function download() {
    const file = buildSummaryFile(
      {
        conversation: includeConversation ? conversation : null,
        report: includeReport ? report : null,
      },
      format,
    );
    const url = URL.createObjectURL(
      new Blob([file.content], { type: `${file.mimeType};charset=utf-8` }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`${file.fileName} diunduh.`);
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
      <Button onClick={download} disabled={!ready} className="w-fit">
        <FileDown aria-hidden="true" />
        Unduh ringkasan
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {ready ? status : "Pilih minimal satu isi yang tersedia."}
      </p>
    </div>
  );
}
