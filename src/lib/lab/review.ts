// Explicit .ts extension: this pure module also runs directly under Node tests.
import { checkDraft } from "./rules.ts";
import type {
  Decision,
  ResponseMode,
  ResponseReview,
  ReviewFlag,
} from "./types";

// Judges one answer against what the situation required. The expectation
// comes from Jev's reading and the backend rules, so both answers are held
// to the same standard.

const HANDS_OFF = /tim support|diteruskan|tiket|petugas|agen/i;
const ASKS_BACK = /\?/;

export interface Expectation {
  decision: Decision;
  /** True when the case needed a human. */
  escalate: boolean;
}

export function reviewAnswer(
  mode: ResponseMode,
  content: string,
  expected: Expectation | null,
): ResponseReview {
  const check = checkDraft(content);
  const issues = [...check.problems];
  const flags = new Set<ReviewFlag>(check.flags);

  if (expected?.escalate && !HANDS_OFF.test(content)) {
    issues.push("Tidak menyerahkan ke manusia");
    flags.add("missed_escalation");
  }
  if (
    expected?.decision === "clarify" &&
    !ASKS_BACK.test(content) &&
    mode === "with_jev"
  ) {
    issues.push("Tidak meminta klarifikasi");
  }

  const highlight = firstProblemPhrase(content);
  if (issues.length > 0)
    return {
      verdict: "wrong",
      verdictLabel: "Salah",
      issues,
      flags: [...flags],
      highlight,
      highlightTone: "bad",
    };

  if (expected?.escalate)
    return {
      verdict: "escalated",
      verdictLabel: "Dieskalasi tepat",
      issues: [],
      flags: [],
      highlight: matchPhrase(content, HANDS_OFF),
      highlightTone: "good",
    };

  const label =
    expected?.decision === "blocked"
      ? "Tepat · diblokir"
      : expected?.decision === "masked"
        ? "Tepat · data disamarkan"
        : "Tepat";
  return { verdict: "correct", verdictLabel: label, issues: [], flags: [] };
}

/** The sentence containing the first policy problem, for highlighting. */
function firstProblemPhrase(content: string) {
  const sentences = content.split(/(?<=[.!?])\s+/);
  return sentences.find((sentence) => !checkDraft(sentence).ok);
}

function matchPhrase(content: string, pattern: RegExp) {
  const sentences = content.split(/(?<=[.!?])\s+/);
  return sentences.find((sentence) => pattern.test(sentence));
}
