import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TestRunReport,
  TestSetSummary,
  VerdictTally,
} from "@/lib/lab/types";
import { mockLastReport, sampleCases } from "@/lib/lab/mock-test-sets";

// Drives one mass test run. This preview version simulates progress from the
// sample report; the API version reports the same shape from the server.

export interface RunProgress {
  status: "idle" | "running" | "done" | "cancelled" | "failed";
  processed: number;
  total: number;
  withJev: VerdictTally;
  withoutJev: VerdictTally;
  message: string | null;
}

const EMPTY: VerdictTally = { correct: 0, wrong: 0, escalated: 0 };

function scaled(tally: VerdictTally, ratio: number): VerdictTally {
  return {
    correct: Math.round(tally.correct * ratio),
    wrong: Math.round(tally.wrong * ratio),
    escalated: Math.round(tally.escalated * ratio),
  };
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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const runNumber = useRef(mockLastReport.runNumber);
  const finishRef = useRef<(() => void) | null>(null);

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const start = useCallback(
    (set: TestSetSummary) => {
      if (timer.current) return;
      const total = set.caseCount;
      const sample = mockLastReport;
      const ratioOf = (processed: number) =>
        (processed / total) * (total / sample.total);
      let processed = 0;
      runNumber.current += 1;
      const finish = () => {
        stopTimer();
        finishRef.current = null;
        const ratio = ratioOf(total);
        const report: TestRunReport = {
          ...sample,
          runId: `local-run-${runNumber.current}`,
          runNumber: runNumber.current,
          testSetId: set.id,
          testSetName: set.name,
          total,
          progress: total,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          withJev: { ...sample.withJev, ...scaled(sample.withJev, ratio) },
          withoutJev: {
            ...sample.withoutJev,
            ...scaled(sample.withoutJev, ratio),
          },
        };
        report.cases = sampleCases(report);
        setProgress({
          status: "done",
          processed: total,
          total,
          withJev: report.withJev,
          withoutJev: report.withoutJev,
          message: `Uji selesai: ${total} pesan diproses. Laporan hasil diperbarui.`,
        });
        onFinished(report);
      };
      finishRef.current = finish;
      setProgress({
        status: "running",
        processed: 0,
        total,
        withJev: EMPTY,
        withoutJev: EMPTY,
        message: "Uji berjalan…",
      });
      timer.current = setInterval(() => {
        processed = Math.min(total, processed + 2);
        if (processed >= total) {
          finish();
          return;
        }
        const ratio = ratioOf(processed);
        setProgress((current) => ({
          ...current,
          processed,
          withJev: scaled(sample.withJev, ratio),
          withoutJev: scaled(sample.withoutJev, ratio),
        }));
      }, 60);
    },
    [onFinished],
  );

  const cancel = useCallback(() => {
    if (!timer.current) return;
    stopTimer();
    finishRef.current = null;
    setProgress((current) => ({
      ...current,
      status: "cancelled",
      message: `Uji dibatalkan di ${current.processed} dari ${current.total} pesan. Laporan sebelumnya tidak berubah.`,
    }));
  }, []);

  // Leaving the page mid-run completes it, as a server run would.
  useEffect(() => () => finishRef.current?.(), []);

  return { progress, start, cancel };
}
