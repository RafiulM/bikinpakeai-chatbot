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
