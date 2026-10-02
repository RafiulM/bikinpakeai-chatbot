import { useCallback, useEffect, useRef, useState } from "react";
import { labApi } from "@/lib/lab/api-client";
import type {
  TestRunReport,
  TestRunState,
  TestSetSummary,
  VerdictTally,
} from "@/lib/lab/types";

// Drives one mass test run on the server. Progress arrives over the run's
// event stream; the run keeps going if the page is left, and a run still in
// progress is picked up again when the page opens.

export interface RunProgress {
  status: "idle" | "running" | "done" | "cancelled" | "failed";
  processed: number;
  total: number;
  withJev: VerdictTally;
  withoutJev: VerdictTally;
  message: string | null;
}

const EMPTY: VerdictTally = { correct: 0, wrong: 0, escalated: 0 };

function messageFor(state: TestRunState) {
  if (state.status === "running") return "Uji berjalan…";
  if (state.status === "done")
    return `Uji selesai: ${state.total} pesan diproses. Laporan hasil diperbarui.`;
  if (state.status === "cancelled")
    return `Uji dibatalkan di ${state.processed} dari ${state.total} pesan. Laporan sebelumnya tidak berubah.`;
  return state.error ?? "Uji gagal diproses. Coba jalankan lagi.";
}

export function useTestRun(onFinished: (report: TestRunReport) => void) {
  const [progress, setProgress] = useState<RunProgress>({
    status: "idle",
    processed: 0,
    total: 0,
    withJev: EMPTY,
    withoutJev: EMPTY,
    message: null,
  });
  const [runId, setRunId] = useState<string | null>(null);
  const finished = useRef(new Set<string>());
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  /** Shows a run's state; a finished run is reported exactly once. */
  const apply = useCallback((state: TestRunState) => {
    setProgress({
      status: state.status,
      processed: state.processed,
      total: state.total,
      withJev: state.withJev,
      withoutJev: state.withoutJev,
      message: messageFor(state),
    });
    if (state.status === "running") {
      setRunId(state.runId);
      return;
    }
    setRunId((current) => (current === state.runId ? null : current));
    if (finished.current.has(state.runId)) return;
    finished.current.add(state.runId);
    if (state.status === "done")
      labApi
        .getTestRunReport(state.runId)
        .then((report) => onFinishedRef.current(report))
        .catch(() =>
          setProgress((current) => ({
            ...current,
            message:
              "Uji selesai, tetapi laporannya gagal dimuat. Muat ulang halaman.",
          })),
        );
  }, []);

  // Pick up a run that is still going, e.g. after leaving the page.
  useEffect(() => {
    let active = true;
    labApi
      .listTestRuns("running")
      .then(([running]) => {
        if (active && running) apply(running);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [apply]);

  // Follow the running run's stream until it ends.
  useEffect(() => {
    if (!runId) return;
    const source = new EventSource(`/api/test-runs/${runId}/events`);
    source.addEventListener("progress", (event) => {
      const state = JSON.parse(event.data) as TestRunState;
      if (state.status !== "running") source.close();
      apply(state);
    });
    return () => source.close();
  }, [runId, apply]);

  const start = useCallback(
    async (set: TestSetSummary) => {
      if (runId) return;
      setProgress({
        status: "running",
        processed: 0,
        total: set.caseCount,
        withJev: EMPTY,
        withoutJev: EMPTY,
        message: "Memulai uji…",
      });
      try {
        apply(await labApi.startTestRun(set.id));
      } catch {
        setProgress((current) => ({
          ...current,
          status: "failed",
          message: "Uji gagal dimulai. Periksa koneksi lalu coba lagi.",
        }));
      }
    },
    [runId, apply],
  );

  const cancel = useCallback(async () => {
    if (!runId) return;
    try {
      apply(await labApi.cancelTestRun(runId));
    } catch {
      // Already finished: the stream reports the final state.
    }
  }, [runId, apply]);

  return { progress, start, cancel };
}
