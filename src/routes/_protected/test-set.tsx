import { useEffect, useState } from "react";
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
import { LabApiError, labApi } from "@/lib/lab/api-client";
import type { TestRunReport, TestSetSummary } from "@/lib/lab/types";

export const Route = createFileRoute("/_protected/test-set")({
  head: () => ({ meta: [{ title: `Uji Test Set | ${siteConfig.name}` }] }),
  component: TestSetPage,
});

function TestSetPage() {
  const [report, setReport] = useState<TestRunReport | null>(null);
  const { progress, start, cancel } = useTestRun(setReport);
  const running = progress.status === "running";
  const [sets, setSets] = useState<TestSetSummary[]>([]);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const chosen = sets.find((set) => set.id === selectedSet);

  // Test sets and the latest finished report come from the API after mount.
  useEffect(() => {
    let active = true;
    Promise.all([labApi.listTestSets(), labApi.listTestRuns("done")])
      .then(async ([loaded, [lastRun]]) => {
        const last = lastRun
          ? await labApi.getTestRunReport(lastRun.runId)
          : null;
        if (!active) return;
        setSets(loaded);
        setSelectedSet((current) => current ?? loaded[0]?.id ?? "upload");
        setReport((current) => current ?? last);
      })
      .catch(() => {
        if (active)
          setLoadError(
            "Test set gagal dimuat. Muat ulang halaman untuk mencoba lagi.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveUpload(upload: UploadedTestSet) {
    setSaving(true);
    setUploadError(null);
    try {
      const created = await labApi.createTestSet(upload.name, upload.cases);
      setSets((current) => [...current, created]);
      setSelectedSet(created.id);
    } catch (error) {
      setUploadError(
        error instanceof LabApiError && error.code === "TOO_MANY_TEST_SETS"
          ? "Sudah ada 20 test set unggahan. Hapus salah satu sebelum mengunggah lagi."
          : "Test set gagal disimpan. Periksa berkas lalu coba lagi.",
      );
    } finally {
      setSaving(false);
    }
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
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <StepCard
          step={1}
          id="test-step-pick"
          title="Pilih test set"
          description="Kumpulan pesan berlabel. Setiap pesan diproses dengan Jev dan tanpa Jev."
        >
          {loading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Memuat test set…
            </p>
          ) : (
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
          )}
          {loadError && (
            <p role="alert" className="text-sm text-danger-text">
              {loadError}
            </p>
          )}
          {selectedSet === "upload" && (
            <UploadForm onSave={saveUpload} saving={saving} />
          )}
          {uploadError && (
            <p role="alert" className="text-sm text-danger-text">
              {uploadError}
            </p>
          )}
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
            onStart={() => chosen && void start(chosen)}
            onCancel={() => void cancel()}
          />
        </StepCard>
      </div>
      <StepCard
        step={3}
        id="test-step-report"
        title="Laporan hasil"
        description={
          report
            ? `Run #${report.runNumber} · ${report.testSetName} · ${report.total} pesan`
            : "Laporan muncul setelah uji pertama selesai."
        }
      >
        {report ? (
          <ReportSummary key={report.runId} report={report} />
        ) : (
          <p className="rounded-[10px] border border-dashed p-4 text-sm text-muted-foreground">
            {loading
              ? "Memuat laporan terakhir…"
              : "Belum ada laporan. Pilih test set lalu jalankan uji."}
          </p>
        )}
      </StepCard>
    </div>
  );
}
