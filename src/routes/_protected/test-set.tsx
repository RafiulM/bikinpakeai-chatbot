import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { ReportSummary } from "@/components/lab/test-set/report-summary";
import { RunPanel } from "@/components/lab/test-set/run-panel";
import { StepCard } from "@/components/lab/test-set/step-card";
import { useTestRun } from "@/components/lab/test-set/use-test-run";
import {
  TestSetOption,
  TestSetPicker,
} from "@/components/lab/test-set/test-set-picker";
import {
  UploadForm,
  type UploadedTestSet,
} from "@/components/lab/test-set/upload-form";
import type { TestRunReport, TestSetSummary } from "@/lib/lab/types";
import { mockLastReport, mockTestSets } from "@/lib/lab/mock-test-sets";

export const Route = createFileRoute("/_protected/test-set")({
  head: () => ({ meta: [{ title: `Uji Test Set | ${siteConfig.name}` }] }),
  component: TestSetPage,
});

function TestSetPage() {
  const [report, setReport] = useState<TestRunReport>(mockLastReport);
  const { progress, start, cancel } = useTestRun(setReport);
  const running = progress.status === "running";
  const [sets, setSets] = useState<TestSetSummary[]>(mockTestSets);
  const [selectedSet, setSelectedSet] = useState<string | null>(
    mockTestSets[0]?.id ?? null,
  );
  const chosen = sets.find((set) => set.id === selectedSet);

  function saveUpload(upload: UploadedTestSet) {
    const created: TestSetSummary = {
      id: `local-set-${Date.now()}`,
      name: upload.name,
      description: "Diunggah dari berkas.",
      caseCount: upload.cases.length,
      categories: [...new Set(upload.cases.map((item) => item.expectedLabel))],
    };
    setSets((current) => [...current, created]);
    setSelectedSet(created.id);
  }
  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Uji Test Set
          </h1>
          <p className="text-sm text-muted-foreground">
            Uji 50–100 pesan berlabel sekaligus untuk mengukur kedua versi
            chatbot
          </p>
        </div>
        <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold">
          Data contoh
        </span>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <StepCard
          step={1}
          id="test-step-pick"
          title="Pilih test set"
          description="Kumpulan pesan berlabel. Setiap pesan diproses dengan Jev dan tanpa Jev."
        >
          <TestSetPicker
            sets={sets}
            value={selectedSet}
            onChange={setSelectedSet}
            disabled={running}
            extraOption={
              <TestSetOption
                name="test-set"
                value="upload"
                checked={selectedSet === "upload"}
                onChange={() => setSelectedSet("upload")}
                title="Unggah berkas sendiri"
                badge="1–100 pesan"
                description="CSV atau JSONL berisi pesan dan label harapan."
              />
            }
          />
          {selectedSet === "upload" && <UploadForm onSave={saveUpload} />}
        </StepCard>
        <StepCard
          step={2}
          id="test-step-run"
          title="Proses uji massal"
          description={
            chosen
              ? `Test set: ${chosen.name} · ${chosen.caseCount} pesan`
              : "Pilih test set dulu."
          }
        >
          <RunPanel
            set={chosen}
            progress={progress}
            onStart={() => chosen && start(chosen)}
            onCancel={cancel}
          />
        </StepCard>
      </div>
      <StepCard
        step={3}
        id="test-step-report"
        title="Laporan hasil"
        description={`Run #${report.runNumber} · ${report.testSetName} · ${report.total} pesan`}
      >
        <ReportSummary key={report.runId} report={report} />
      </StepCard>
    </div>
  );
}
