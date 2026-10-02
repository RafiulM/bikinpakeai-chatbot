import { maskSensitive } from "@/lib/lab/mask";
import { applyRules, checkDraft } from "@/lib/lab/rules";
import type { IssueType } from "@/lib/lab/types";
import {
  answerBaseline,
  answerFallback,
  answerWithHandler,
  TEMPLATES,
  type DraftAnswer,
} from "./answers.server";
import { readMessage } from "./jev.server";

// Both answer paths for one test message, exactly as the live pipeline runs
// them (see orchestrator.server.ts) but without storing a conversation,
// analysis, or ticket: a mass test must not touch the Agent queue.

export interface TestAnswer {
  content: string;
  latencyMs: number;
  costUsd: number;
  /** Issue type Jev read; null on the baseline or when the reading failed. */
  issueType: IssueType | null;
}

const SAFE_DRAFT: DraftAnswer = {
  content: TEMPLATES.safeFallback,
  modelId: null,
  latencyMs: 0,
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
};

const since = (started: number) =>
  Math.max(0, Math.round(performance.now() - started));

/** With Jev: read → backend rules → cheapest handler → verify draft. */
export async function answerWithJevForTest(raw: string): Promise<TestAnswer> {
  const started = performance.now();
  const { text, masked } = maskSensitive(raw);
  const reading = await readMessage(text, masked).catch(() => null);
  const rules = reading ? applyRules(reading.classification) : null;
  const draft = await (
    rules
      ? answerWithHandler(rules.route, rules.decision, text, null)
      : answerFallback(text)
  ).catch(() => SAFE_DRAFT);
  const check = checkDraft(draft.content);
  return {
    content: check.ok ? draft.content : TEMPLATES.safeFallback,
    latencyMs: since(started),
    costUsd: (reading?.usage.costUsd ?? 0) + draft.usage.costUsd,
    issueType: reading?.classification.issueType ?? null,
  };
}

/** Without Jev: one capable model, same knowledge base, nothing else. */
export async function answerWithoutJevForTest(
  raw: string,
): Promise<TestAnswer> {
  const started = performance.now();
  const draft = await answerBaseline(raw);
  return {
    content: draft.content,
    latencyMs: draft.modelId ? draft.latencyMs : since(started),
    costUsd: draft.usage.costUsd,
    issueType: null,
  };
}
