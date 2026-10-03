import { EventEmitter } from "node:events";
import { and, asc, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/index.server";
import { testCases, testResults, testRuns, testSets } from "@/db/schema";
import { gradeAnswer } from "@/lib/lab/test-grade";
import { categoryScores, summarizeCases } from "@/lib/lab/test-report";
import type {
  IssueType,
  ResponseMode,
  TestCaseOutcome,
  TestCaseResult,
  TestRunReport,
  TestRunState,
  TestRunStatus,
  Verdict,
  VerdictTally,
} from "@/lib/lab/types";
import { withAccountAi } from "./ai-settings.service.server";
import {
  answerWithJevForTest,
  answerWithoutJevForTest,
  type TestAnswer,
} from "./pipeline/test-answers.server";

// Mass test ("Run test set"): every labelled message goes through both
// versions, is graded against its label, and is stored as it finishes so the
// screen can follow progress. Runs live in this process (see events.server).

/** Messages answered at the same time; keeps model rate limits comfortable. */
const CONCURRENCY = 3;

const shared = globalThis as typeof globalThis & {
  __testRuns?: { active: Map<string, AbortController>; bus: EventEmitter };
};
// Reuse one registry across dev hot reloads.
const registry = (shared.__testRuns ??= {
  active: new Map(),
  bus: new EventEmitter().setMaxListeners(0),
});

/** Follows one run; the listener gets the full state after every change. */
export function subscribeTestRun(
  runId: string,
  listener: (state: TestRunState) => void,
) {
  registry.bus.on(runId, listener);
  return () => {
    registry.bus.off(runId, listener);
  };
}

const RESTARTED =
  "Uji terhenti karena server dimulai ulang. Jalankan lagi untuk hasil lengkap.";

/** A run marked running that no worker in this process owns was cut off. */
async function closeOrphan(runId: string) {
  if (registry.active.has(runId)) return;
  await db
    .update(testRuns)
    .set({ status: "failed", error: RESTARTED, finishedAt: new Date() })
    .where(and(eq(testRuns.id, runId), eq(testRuns.status, "running")));
}

/** Current state of one of the account's runs, with verdict tallies so far. */
export async function getTestRunState(
  userId: string,
  runId: string,
): Promise<TestRunState | undefined> {
  const [found] = await db
    .select({ status: testRuns.status })
    .from(testRuns)
    .where(and(eq(testRuns.id, runId), eq(testRuns.userId, userId)))
    .limit(1);
  if (!found) return undefined;
  if (found.status === "running") await closeOrphan(runId);
  return readState(runId);
}

/** The account's most recent runs, newest first. */
export async function listTestRuns(
  userId: string,
  limit: number,
  status?: TestRunStatus,
) {
  const rows = await db
    .select({ id: testRuns.id, status: testRuns.status })
    .from(testRuns)
    .where(
      and(
        eq(testRuns.userId, userId),
        status ? eq(testRuns.status, status) : undefined,
      ),
    )
    .orderBy(desc(testRuns.startedAt))
    .limit(limit);
  for (const row of rows)
    if (row.status === "running") await closeOrphan(row.id);
  return Promise.all(rows.map((row) => readState(row.id)));
}

/** The newest finished run of each test set the account ran, newest first. */
export async function listLatestRunPerSet(userId: string) {
  const rows = await db
    .selectDistinctOn([testRuns.testSetId], {
      id: testRuns.id,
      startedAt: testRuns.startedAt,
    })
    .from(testRuns)
    .where(and(eq(testRuns.userId, userId), eq(testRuns.status, "done")))
    .orderBy(testRuns.testSetId, desc(testRuns.startedAt));
  rows.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  return Promise.all(rows.map((row) => readState(row.id)));
}

async function readState(runId: string): Promise<TestRunState> {
  const [[run], tallies] = await Promise.all([
    db
      .select({
        id: testRuns.id,
        number: testRuns.number,
        testSetId: testRuns.testSetId,
        testSetName: testSets.name,
        status: testRuns.status,
        progress: testRuns.progress,
        total: testRuns.total,
        error: testRuns.error,
        startedAt: testRuns.startedAt,
        finishedAt: testRuns.finishedAt,
      })
      .from(testRuns)
      .innerJoin(testSets, eq(testSets.id, testRuns.testSetId))
      .where(eq(testRuns.id, runId))
      .limit(1),
    db
      .select({
        mode: testResults.mode,
        verdict: testResults.verdict,
        count: count(),
      })
      .from(testResults)
      .where(eq(testResults.testRunId, runId))
      .groupBy(testResults.mode, testResults.verdict),
  ]);
  const tally = (mode: ResponseMode): VerdictTally => {
    const of = (verdict: Verdict) =>
      tallies.find((row) => row.mode === mode && row.verdict === verdict)
        ?.count ?? 0;
    return {
      correct: of("correct"),
      wrong: of("wrong"),
      escalated: of("escalated"),
    };
  };
  return {
    runId: run.id,
    runNumber: run.number ?? 0,
    testSetId: run.testSetId,
    testSetName: run.testSetName,
    status: run.status as TestRunStatus,
    processed: run.progress,
    total: run.total,
    withJev: tally("with_jev"),
    withoutJev: tally("without_jev"),
    error: run.error,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}

async function publish(runId: string) {
  if (registry.bus.listenerCount(runId) === 0) return;
  registry.bus.emit(runId, await readState(runId));
}

/**
 * Full report of one of the account's runs: per-message outcomes in test-set
 * order plus totals and category scores derived from them. A run that was
 * cancelled or is still going reports the messages finished so far.
 */
export async function getTestRunReport(
  userId: string,
  runId: string,
): Promise<TestRunReport | undefined> {
  const state = await getTestRunState(userId, runId);
  if (!state) return undefined;
  const rows = await db
    .select({
      caseId: testCases.id,
      inputText: testCases.inputText,
      expectedLabel: testCases.expectedLabel,
      category: testCases.category,
      mode: testResults.mode,
      verdict: testResults.verdict,
      issueType: testResults.issueType,
      latencyMs: testResults.latencyMs,
      costUsd: testResults.costUsd,
    })
    .from(testResults)
    .innerJoin(testCases, eq(testCases.id, testResults.testCaseId))
    .where(eq(testResults.testRunId, runId))
    .orderBy(asc(testCases.position), asc(testResults.mode));

  const byCase = new Map<string, Partial<TestCaseResult>>();
  for (const row of rows) {
    const item = byCase.get(row.caseId) ?? {
      caseId: row.caseId,
      inputText: row.inputText,
      expectedLabel: row.expectedLabel,
      category: row.category as IssueType | null,
    };
    const outcome: TestCaseOutcome = {
      verdict: row.verdict as Verdict,
      latencyMs: row.latencyMs,
      costUsd: row.costUsd,
    };
    if (row.mode === "with_jev") {
      item.withJev = outcome;
      item.category ??= row.issueType as IssueType | null;
    } else item.withoutJev = outcome;
    byCase.set(row.caseId, item);
  }
  const cases = [...byCase.values()].filter(
    (item): item is TestCaseResult => !!item.withJev && !!item.withoutJev,
  );
  return {
    runId: state.runId,
    runNumber: state.runNumber,
    testSetId: state.testSetId,
    testSetName: state.testSetName,
    total: cases.length,
    status: state.status,
    progress: state.processed,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    ...summarizeCases(cases),
    categories: categoryScores(cases),
    cases,
  };
}

export type StartTestRunResult =
  | { kind: "not_found" }
  | { kind: "busy"; runId: string }
  | { kind: "started"; run: TestRunState };

/**
 * Starts a run of a test set the account may use. One run per account at a
 * time; the work continues in the background after this returns.
 */
export async function startTestRun(
  userId: string,
  testSetId: string,
): Promise<StartTestRunResult> {
  const result = await db.transaction(async (tx) => {
    // Serialize starts per account so two clicks cannot start two runs.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`test-run:${userId}`}))`,
    );
    const [set] = await tx
      .select({ id: testSets.id })
      .from(testSets)
      .where(
        and(
          eq(testSets.id, testSetId),
          or(isNull(testSets.userId), eq(testSets.userId, userId)),
        ),
      )
      .limit(1);
    if (!set) return { kind: "not_found" as const };

    const [running] = await tx
      .select({ id: testRuns.id })
      .from(testRuns)
      .where(and(eq(testRuns.userId, userId), eq(testRuns.status, "running")))
      .orderBy(desc(testRuns.startedAt))
      .limit(1);
    if (running && registry.active.has(running.id))
      return { kind: "busy" as const, runId: running.id };
    if (running)
      await tx
        .update(testRuns)
        .set({ status: "failed", error: RESTARTED, finishedAt: new Date() })
        .where(eq(testRuns.id, running.id));

    const cases = await tx
      .select({
        id: testCases.id,
        inputText: testCases.inputText,
        expectedLabel: testCases.expectedLabel,
      })
      .from(testCases)
      .where(eq(testCases.testSetId, testSetId))
      .orderBy(asc(testCases.position));
    const [run] = await tx
      .insert(testRuns)
      .values({ userId, testSetId, total: cases.length })
      .returning({ id: testRuns.id });
    return { kind: "created" as const, runId: run.id, cases };
  });
  if (result.kind !== "created") return result;

  const controller = new AbortController();
  registry.active.set(result.runId, controller);
  void processRun(userId, result.runId, result.cases, controller.signal);
  return { kind: "started", run: await readState(result.runId) };
}

type CaseRow = { id: string; inputText: string; expectedLabel: string };

async function processRun(
  userId: string,
  runId: string,
  cases: CaseRow[],
  signal: AbortSignal,
) {
  try {
    let next = 0;
    const worker = async () => {
      while (!signal.aborted && next < cases.length) {
        const item = cases[next++];
        await processCase(runId, item);
        // Counted even after a cancel, so progress always matches the
        // stored results.
        await db
          .update(testRuns)
          .set({ progress: sql`${testRuns.progress} + 1` })
          .where(eq(testRuns.id, runId));
        await publish(runId);
      }
    };
    // The account's own OpenRouter key, if saved, answers every message.
    await withAccountAi(userId, () =>
      Promise.all(Array.from({ length: CONCURRENCY }, worker)),
    );
    if (!signal.aborted)
      await db
        .update(testRuns)
        .set({ status: "done", finishedAt: new Date() })
        .where(and(eq(testRuns.id, runId), eq(testRuns.status, "running")));
  } catch (error) {
    registry.active.get(runId)?.abort();
    console.error(
      "Test run failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    await db
      .update(testRuns)
      .set({
        status: "failed",
        error: "Uji gagal diproses. Coba jalankan lagi.",
        finishedAt: new Date(),
      })
      .where(and(eq(testRuns.id, runId), eq(testRuns.status, "running")))
      .catch(() => undefined);
  } finally {
    registry.active.delete(runId);
    await publish(runId).catch(() => undefined);
  }
}

/** Answers one message on both versions at once and stores both grades. */
async function processCase(runId: string, item: CaseRow) {
  const [withJev, withoutJev] = await Promise.all([
    answerWithJevForTest(item.inputText),
    answerWithoutJevForTest(item.inputText).catch((): TestAnswer => ({
      content: "",
      latencyMs: 0,
      costUsd: 0,
      issueType: null,
    })),
  ]);
  const row = (mode: ResponseMode, answer: TestAnswer) => {
    const grade = answer.content
      ? gradeAnswer(item.expectedLabel, item.inputText, answer.content)
      : { verdict: "wrong" as const, decision: null };
    return {
      testRunId: runId,
      testCaseId: item.id,
      mode,
      verdict: grade.verdict,
      decision: grade.decision,
      issueType: answer.issueType,
      latencyMs: answer.latencyMs,
      costUsd: answer.costUsd,
    };
  };
  await db
    .insert(testResults)
    .values([row("with_jev", withJev), row("without_jev", withoutJev)])
    .onConflictDoNothing();
}

export type CancelTestRunResult =
  | { kind: "not_found" }
  | { kind: "not_running"; run: TestRunState }
  | { kind: "cancelled"; run: TestRunState };

/** Stops one of the account's running runs; finished messages are kept. */
export async function cancelTestRun(
  userId: string,
  runId: string,
): Promise<CancelTestRunResult> {
  const [run] = await db
    .update(testRuns)
    .set({ status: "cancelled", finishedAt: new Date() })
    .where(
      and(
        eq(testRuns.id, runId),
        eq(testRuns.userId, userId),
        eq(testRuns.status, "running"),
      ),
    )
    .returning({ id: testRuns.id });
  if (!run) {
    const state = await getTestRunState(userId, runId);
    return state ? { kind: "not_running", run: state } : { kind: "not_found" };
  }
  registry.active.get(runId)?.abort();
  await publish(runId);
  return { kind: "cancelled", run: await readState(runId) };
}

/**
 * Runs several test sets one after another in the background (one run per
 * account at a time). A set whose start fails is skipped.
 */
export async function runTestSetsInOrder(userId: string, testSetIds: string[]) {
  for (const testSetId of testSetIds) {
    let started = await startTestRun(userId, testSetId);
    // Wait out a run the account already had going, then start this one.
    if (started.kind === "busy") {
      await waitForRun(userId, started.runId);
      started = await startTestRun(userId, testSetId);
    }
    if (started.kind === "started") await waitForRun(userId, started.run.runId);
  }
}

async function waitForRun(userId: string, runId: string) {
  for (;;) {
    const state = await getTestRunState(userId, runId);
    if (!state || state.status !== "running") return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
