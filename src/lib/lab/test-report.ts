import { ratioText } from "./compare";
import { CATEGORY_LABEL } from "./scenarios";
import {
  ISSUE_TYPES,
  type IssueType,
  type ResponseMode,
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

const points = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 100);

type VersionSummary = TestRunReport["withJev"];

export interface VersionScore extends VersionSummary {
  /** Right answers (correct plus correct hand-offs). */
  right: number;
  /** Right answers as whole percentage points, 0–100. */
  score: number;
}

export interface ScoreComparison {
  /** What the scores cover: one issue category or the whole run. */
  scope: { category: IssueType | null; label: string; total: number };
  withJev: VersionScore;
  withoutJev: VersionScore;
  /** Jev's score minus the baseline's, in percentage points. */
  gapPoints: number;
  winner: ResponseMode | "tie";
  /** One-sentence conclusion, e.g. "Jev unggul 29 poin: 90% lawan 61%." */
  headline: string;
  /** Where Jev is ahead besides the score, e.g. "4,2× lebih cepat". */
  highlights: string[];
  /** Per-category scores; empty when the scope is one category. */
  categories: {
    id: IssueType;
    label: string;
    total: number;
    withJev: number;
    withoutJev: number;
    gapPoints: number;
  }[];
}

function versionScore(summary: VersionSummary, total: number): VersionScore {
  const right = rightCount(summary);
  return { ...summary, right, score: points(right, total) };
}

/**
 * Final scores of both versions side by side, as a conclusion. Scoped to one
 * issue category when given; that needs the report's per-message cases.
 */
export function compareScores(
  report: Pick<
    TestRunReport,
    "total" | "withJev" | "withoutJev" | "categories" | "cases"
  >,
  category: IssueType | null = null,
): ScoreComparison {
  const inScope =
    category && report.cases
      ? report.cases.filter((item) => item.category === category)
      : null;
  const totals = inScope ? summarizeCases(inScope) : report;
  const total = inScope ? inScope.length : report.total;
  const withJev = versionScore(totals.withJev, total);
  const withoutJev = versionScore(totals.withoutJev, total);
  const gapPoints = withJev.score - withoutJev.score;
  const fewerWrong = withoutJev.wrong - withJev.wrong;

  return {
    scope: {
      category: inScope ? category : null,
      label: inScope && category ? CATEGORY_LABEL[category] : "Semua kategori",
      total,
    },
    withJev,
    withoutJev,
    gapPoints,
    winner: gapPoints > 0 ? "with_jev" : gapPoints < 0 ? "without_jev" : "tie",
    headline:
      gapPoints > 0
        ? `Jev unggul ${gapPoints} poin: ${withJev.score}% lawan ${withoutJev.score}%.`
        : gapPoints < 0
          ? `Pembanding unggul ${-gapPoints} poin: ${withoutJev.score}% lawan ${withJev.score}%.`
          : `Skor sama: ${withJev.score}%.`,
    highlights: [
      ratioText(withJev.averageLatencyMs, withoutJev.averageLatencyMs, "speed"),
      ratioText(withJev.totalCostUsd, withoutJev.totalCostUsd, "cost"),
      fewerWrong > 0 ? `${fewerWrong} jawaban salah lebih sedikit` : null,
    ].filter((item): item is string => item !== null),
    categories: inScope
      ? []
      : report.categories.map((item) => {
          const jev = points(item.withJev, item.total);
          const base = points(item.withoutJev, item.total);
          return {
            id: item.id,
            label: item.label,
            total: item.total,
            withJev: jev,
            withoutJev: base,
            gapPoints: jev - base,
          };
        }),
  };
}
