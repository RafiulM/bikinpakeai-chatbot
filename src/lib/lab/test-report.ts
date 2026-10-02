import { CATEGORY_LABEL } from "./scenarios";
import {
  ISSUE_TYPES,
  type TestCaseResult,
  type TestRunReport,
  type VerdictTally,
} from "./types";

// Report totals derived from per-message results. Pure, so the preview data
// and the server report count verdicts exactly the same way.

/** Right answers: correct ones plus correct hand-offs to a human. */
export const rightCount = (tally: VerdictTally) =>
  tally.correct + tally.escalated;

type Side = "withJev" | "withoutJev";

function summarizeSide(cases: TestCaseResult[], side: Side) {
  const summary = {
    correct: 0,
    wrong: 0,
    escalated: 0,
    averageLatencyMs: 0,
    totalCostUsd: 0,
  };
  let latency = 0;
  for (const item of cases) {
    const outcome = item[side];
    summary[outcome.verdict] += 1;
    latency += outcome.latencyMs;
    summary.totalCostUsd += outcome.costUsd;
  }
  summary.averageLatencyMs = cases.length
    ? Math.round(latency / cases.length)
    : 0;
  return summary;
}

/** Verdict counts, average time, and total cost for both versions. */
export function summarizeCases(cases: TestCaseResult[]) {
  return {
    withJev: summarizeSide(cases, "withJev"),
    withoutJev: summarizeSide(cases, "withoutJev"),
  };
}

/** Right answers per issue category, in the fixed category order. */
export function categoryScores(
  cases: TestCaseResult[],
): TestRunReport["categories"] {
  return ISSUE_TYPES.flatMap((id) => {
    const inCategory = cases.filter((item) => item.category === id);
    if (inCategory.length === 0) return [];
    const { withJev, withoutJev } = summarizeCases(inCategory);
    return [
      {
        id,
        label: CATEGORY_LABEL[id],
        withJev: rightCount(withJev),
        withoutJev: rightCount(withoutJev),
        total: inCategory.length,
      },
    ];
  });
}
