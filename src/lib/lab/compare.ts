import type { ConversationTurn, ResponseMode, Verdict } from "./types";

// Pure comparison rules shared by the Compare, Debug and recording views.

export type Winner = ResponseMode | "tie";

// A correct answer and a correct hand-off to a human count the same.
const VERDICT_RANK: Record<Verdict, number> = {
  correct: 1,
  escalated: 1,
  wrong: 0,
};

/**
 * Which answer is better: the one with the better verdict first; when both
 * are equally right, the faster one, then the cheaper one.
 */
export function pickWinner(turn: ConversationTurn): Winner {
  const jev = turn.withJev;
  const base = turn.withoutJev;
  if (!jev || !base) return "tie";
  const rankDiff =
    VERDICT_RANK[jev.review.verdict] - VERDICT_RANK[base.review.verdict];
  if (rankDiff !== 0) return rankDiff > 0 ? "with_jev" : "without_jev";
  if (jev.latencyMs !== base.latencyMs)
    return jev.latencyMs < base.latencyMs ? "with_jev" : "without_jev";
  if (jev.costUsd !== base.costUsd)
    return jev.costUsd < base.costUsd ? "with_jev" : "without_jev";
  return "tie";
}

/** True when one answer was right and the other was not. */
export function verdictsDiffer(turn: ConversationTurn) {
  if (!turn.withJev || !turn.withoutJev) return false;
  return (
    VERDICT_RANK[turn.withJev.review.verdict] !==
    VERDICT_RANK[turn.withoutJev.review.verdict]
  );
}

export function isCorrect(verdict: Verdict) {
  return VERDICT_RANK[verdict] === 1;
}

/** Splits text around the first exact occurrence of a phrase. */
export function splitHighlight(text: string, phrase: string | undefined) {
  if (!phrase) return null;
  const start = text.indexOf(phrase);
  if (start === -1) return null;
  return {
    before: text.slice(0, start),
    match: phrase,
    after: text.slice(start + phrase.length),
  };
}

export interface TurnDelta {
  /** Positive when Jev was faster. */
  latencyMs: number;
  /** Positive when Jev was cheaper. */
  costUsd: number;
  /** How many times faster Jev was (baseline ÷ Jev); null when undefined. */
  speedup: number | null;
  /** Share of the baseline cost saved by Jev (0–1, negative when pricier). */
  costSaving: number | null;
  accuracy: "jev_better" | "base_better" | "both_right" | "both_wrong";
  winner: Winner;
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export function turnDelta(turn: ConversationTurn): TurnDelta | null {
  const jev = turn.withJev;
  const base = turn.withoutJev;
  if (!jev || !base) return null;
  const jevRight = isCorrect(jev.review.verdict);
  const baseRight = isCorrect(base.review.verdict);
  const costSaving = ratio(base.costUsd - jev.costUsd, base.costUsd);
  return {
    latencyMs: base.latencyMs - jev.latencyMs,
    costUsd: base.costUsd - jev.costUsd,
    speedup: ratio(base.latencyMs, jev.latencyMs),
    costSaving: costSaving === null ? null : Math.round(costSaving * 1e4) / 1e4,
    winner: pickWinner(turn),
    accuracy:
      jevRight && baseRight
        ? "both_right"
        : jevRight
          ? "jev_better"
          : baseRight
            ? "base_better"
            : "both_wrong",
  };
}

export interface ModeTotals {
  answered: number;
  correct: number;
  latencyMs: number;
  costUsd: number;
  security: number;
  policy: number;
  missedEscalation: number;
}

export interface ConversationSummary {
  /** Turns where both answers are available. */
  compared: number;
  jevBetterCount: number;
  withJev: ModeTotals;
  withoutJev: ModeTotals;
  /** Accuracy (0–1) after each compared message, for both answer paths. */
  running: { withJev: number; withoutJev: number }[];
}

function emptyTotals(): ModeTotals {
  return {
    answered: 0,
    correct: 0,
    latencyMs: 0,
    costUsd: 0,
    security: 0,
    policy: 0,
    missedEscalation: 0,
  };
}

function add(
  totals: ModeTotals,
  response: NonNullable<ConversationTurn["withJev"]>,
) {
  totals.answered += 1;
  if (isCorrect(response.review.verdict)) totals.correct += 1;
  totals.latencyMs += response.latencyMs;
  totals.costUsd += response.costUsd;
  const flags = response.review.flags ?? [];
  if (flags.includes("security")) totals.security += 1;
  if (flags.includes("policy")) totals.policy += 1;
  if (flags.includes("missed_escalation")) totals.missedEscalation += 1;
}

/** Running totals across the conversation; the numbers rise and fall per message. */
export function summarize(turns: ConversationTurn[]): ConversationSummary {
  const withJev = emptyTotals();
  const withoutJev = emptyTotals();
  const running: ConversationSummary["running"] = [];
  let jevBetterCount = 0;
  for (const turn of turns) {
    if (!turn.withJev || !turn.withoutJev) continue;
    add(withJev, turn.withJev);
    add(withoutJev, turn.withoutJev);
    if (turnDelta(turn)?.accuracy === "jev_better") jevBetterCount += 1;
    running.push({
      withJev: withJev.correct / withJev.answered,
      withoutJev: withoutJev.correct / withoutJev.answered,
    });
  }
  return {
    compared: running.length,
    jevBetterCount,
    withJev,
    withoutJev,
    running,
  };
}

/** "4× lebih cepat" or "93% lebih hemat" for Jev, or null when not ahead. */
export function ratioText(jev: number, base: number, unit: "speed" | "cost") {
  if (jev <= 0 || base <= 0) return null;
  if (unit === "speed") {
    const times = base / jev;
    return times >= 1.05
      ? `${times.toLocaleString("id-ID", { maximumFractionDigits: 1 })}× lebih cepat`
      : null;
  }
  const saved = 1 - jev / base;
  return saved >= 0.01 ? `${Math.floor(saved * 100)}% lebih hemat` : null;
}

/** One-sentence verdict on a conversation, e.g. "Jev lebih tepat di 3 dari 5 pesan." */
export function conversationHeadline(summary: ConversationSummary) {
  const { compared, jevBetterCount, withJev, withoutJev } = summary;
  if (jevBetterCount > 0)
    return `Jev lebih tepat di ${jevBetterCount} dari ${compared} pesan.`;
  if (withJev.correct === withoutJev.correct)
    return `Ketepatan sama di ${compared} pesan.`;
  return "Pembanding lebih tepat di percakapan ini.";
}
