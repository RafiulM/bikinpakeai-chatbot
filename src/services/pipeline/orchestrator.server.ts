import { maskSensitive } from "@/lib/lab/mask";
import { reviewAnswer, type Expectation } from "@/lib/lab/review";
import { applyRules, checkDraft } from "@/lib/lab/rules";
import type { BotResponse, JevAnalysis } from "@/lib/lab/types";
import { saveResponse } from "@/services/comparison.service.server";
import { saveJevAnalysis, saveJevFailure } from "@/services/jev.service.server";
import { failureReason } from "./ai.server";
import {
  answerBaseline,
  answerFallback,
  answerWithHandler,
  TEMPLATES,
  type DraftAnswer,
} from "./answers.server";
import { readLocally, readMessage } from "./jev.server";

// Runs both answer paths for one stored customer message, in parallel:
//   with Jev    — read → backend rules → cheapest handler → verify draft
//   without Jev — one capable model, same knowledge base and policy
// The customer gets the Jev answer as soon as it is ready; the baseline
// finishes in the background and reaches the views through live events.

export interface EscalationContext {
  messageId: string;
  analysis: JevAnalysis;
}

export interface PipelineInput {
  messageId: string;
  /** Original text, kept in memory only and never stored unmasked. */
  rawText: string;
  /** Masked text as stored. */
  maskedText: string;
  masked: boolean;
  /** Opens a support ticket and returns its code (e.g. "T-208"). */
  onEscalate?: (context: EscalationContext) => Promise<string | null>;
}

export interface JevPathResult {
  analysis: JevAnalysis | null;
  analysisError: string | null;
  withJev: BotResponse;
  ticketId: string | null;
}

const SAFE_DRAFT: DraftAnswer = {
  content: TEMPLATES.safeFallback,
  modelId: null,
  latencyMs: 0,
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
};

function since(started: number) {
  return Math.max(0, Math.round(performance.now() - started));
}

/** What a correct answer should have done, from the rules' point of view. */
function expectationFor(text: string, masked: boolean): Expectation {
  const rules = applyRules(readLocally(text, masked).classification);
  return { decision: rules.decision, escalate: rules.escalate };
}

async function runJevPath(
  input: PipelineInput,
  settleExpectation: (expectation: Expectation) => void,
): Promise<JevPathResult> {
  const started = performance.now();
  let reading;
  try {
    reading = await readMessage(input.maskedText, input.masked);
  } catch (error) {
    // Jev could not read the message: record it, then still answer the
    // customer through the verified fallback handler.
    const reason = failureReason(error);
    await saveJevFailure(input.messageId, reason);
    settleExpectation(expectationFor(input.maskedText, input.masked));
    const draft = await answerFallback(input.maskedText).catch(
      () => SAFE_DRAFT,
    );
    const check = checkDraft(draft.content);
    const content = check.ok ? draft.content : TEMPLATES.safeFallback;
    const withJev = await saveResponse({
      messageId: input.messageId,
      mode: "with_jev",
      content,
      latencyMs: since(started),
      costUsd: draft.usage.costUsd,
      isVerified: true,
      modelId: draft.modelId,
      inputTokens: draft.usage.inputTokens,
      outputTokens: draft.usage.outputTokens,
      ...reviewAnswer("with_jev", content, null),
    });
    return { analysis: null, analysisError: reason, withJev, ticketId: null };
  }

  const ruleStart = performance.now();
  const rules = applyRules(reading.classification);
  const ruleMs = since(ruleStart);
  settleExpectation({ decision: rules.decision, escalate: rules.escalate });

  const { labels, confidence, ...classified } = reading.classification;
  const baseAnalysis = {
    ...classified,
    labels,
    confidence,
    decision: rules.decision,
    route: rules.route,
    routeLabel: rules.routeLabel,
    routeReason: rules.routeReason,
    rules: rules.rules,
  };

  let ticketId: string | null = null;
  if (rules.escalate && input.onEscalate) {
    ticketId = await input
      .onEscalate({
        messageId: input.messageId,
        analysis: { messageId: input.messageId, ...baseAnalysis, steps: [] },
      })
      .catch(() => null);
  }

  const draft = await answerWithHandler(
    rules.route,
    rules.decision,
    input.maskedText,
    ticketId,
  ).catch(() => SAFE_DRAFT);
  const verifyStart = performance.now();
  const check = checkDraft(draft.content);
  const content = check.ok ? draft.content : TEMPLATES.safeFallback;
  const verifyMs = since(verifyStart);

  const analysis = await saveJevAnalysis(
    input.messageId,
    {
      ...baseAnalysis,
      steps: [
        {
          name: "Klasifikasi",
          note: "1 panggilan Jev",
          durationMs: reading.latencyMs,
        },
        {
          name: "Aturan backend",
          note:
            rules.decision === "answered"
              ? "Tidak ada tindakan"
              : rules.rules[0],
          durationMs: ruleMs,
        },
        {
          name: "Penangan",
          note: rules.routeLabel,
          durationMs: draft.latencyMs,
        },
        {
          name: "Verifikasi draf",
          note: check.ok
            ? "Lolos"
            : `Diganti template aman: ${check.problems.join(", ")}`,
          durationMs: verifyMs,
        },
      ],
    },
    {
      modelId: reading.modelId,
      inputTokens: reading.usage.inputTokens,
      outputTokens: reading.usage.outputTokens,
      latencyMs: reading.latencyMs,
      costUsd: reading.usage.costUsd,
    },
    ticketId,
  );

  const withJev = await saveResponse({
    messageId: input.messageId,
    mode: "with_jev",
    content,
    latencyMs: since(started),
    costUsd: reading.usage.costUsd + draft.usage.costUsd,
    isVerified: true,
    modelId: draft.modelId,
    inputTokens: reading.usage.inputTokens + draft.usage.inputTokens,
    outputTokens: reading.usage.outputTokens + draft.usage.outputTokens,
    ...reviewAnswer("with_jev", content, {
      decision: rules.decision,
      escalate: rules.escalate,
    }),
  });
  return { analysis, analysisError: null, withJev, ticketId };
}

async function runBaselinePath(
  input: PipelineInput,
  expectation: Promise<Expectation>,
) {
  const started = performance.now();
  const draft = await answerBaseline(input.rawText);
  // Judge the answer as the customer would have received it, then mask it
  // before storage so no card number ever reaches the database.
  const review = reviewAnswer("without_jev", draft.content, await expectation);
  const stored = maskSensitive(draft.content).text;
  return saveResponse({
    messageId: input.messageId,
    mode: "without_jev",
    content: stored,
    latencyMs: draft.modelId ? draft.latencyMs : since(started),
    costUsd: draft.usage.costUsd,
    isVerified: false,
    modelId: draft.modelId,
    inputTokens: draft.usage.inputTokens,
    outputTokens: draft.usage.outputTokens,
    ...review,
    highlight: review.highlight
      ? maskSensitive(review.highlight).text
      : undefined,
  });
}

/**
 * Starts both paths. Resolves with the Jev answer for the customer; the
 * baseline keeps running and is returned separately for callers that wait.
 */
export async function answerMessage(input: PipelineInput) {
  let settle!: (expectation: Expectation) => void;
  const expectation = new Promise<Expectation>((resolve) => {
    settle = resolve;
  });
  const baseline = runBaselinePath(input, expectation).catch((error) => {
    console.error(
      "Baseline answer failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return null;
  });
  try {
    const jev = await runJevPath(input, settle);
    return { jev, baseline };
  } catch (error) {
    // Never leave the baseline waiting on an expectation that will not come.
    settle(expectationFor(input.maskedText, input.masked));
    throw error;
  }
}
