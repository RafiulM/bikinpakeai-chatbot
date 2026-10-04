import { maskSensitive } from "@/lib/lab/mask";
import { reviewAnswer, type Expectation } from "@/lib/lab/review";
import { applyRules, checkDraft, type RuleContext } from "@/lib/lab/rules";
import type {
  BotResponse,
  ConversationTurn,
  JevAnalysis,
  PriorExchange,
  ResponseMode,
} from "@/lib/lab/types";
import {
  saveAnswerFailure,
  saveResponse,
} from "@/services/comparison.service.server";
import { saveJevAnalysis, saveJevFailure } from "@/services/jev.service.server";
import { failureReason, failureStatus } from "./ai.server";
import {
  answerBaseline,
  answerFallback,
  baselineModelId,
  handlerContext,
  runHandler,
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
  refundRequested: boolean;
}

export interface PipelineInput {
  messageId: string;
  /** Original text, kept in memory only and never stored unmasked. */
  rawText: string;
  /** Masked text as stored. */
  maskedText: string;
  masked: boolean;
  /** Earlier turns of the conversation, oldest first. */
  history?: ConversationTurn[];
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
  docCount: 0,
};

/** One log line per model failure: the error kind, status and safe reason. */
function logFailure(step: string, error: unknown) {
  console.error(
    `${step} failed:`,
    error instanceof Error ? error.name : "UnknownError",
    failureStatus(error) ?? "",
    failureReason(error),
  );
}

function since(started: number) {
  return Math.max(0, Math.round(performance.now() - started));
}

const CONTEXT_TURNS = 3;
const CONTEXT_CHARS = 800;

const clip = (text: string) =>
  text.length > CONTEXT_CHARS ? `${text.slice(0, CONTEXT_CHARS - 1)}…` : text;

/**
 * The last few exchanges as one answer path saw them. The Jev path also
 * includes human replies from the Agent view, since the customer saw them.
 */
function priorExchanges(
  turns: ConversationTurn[] = [],
  mode: ResponseMode,
): PriorExchange[] {
  return turns.slice(-CONTEXT_TURNS).map((turn) => {
    const replies =
      mode === "with_jev"
        ? [
            turn.withJev?.content,
            ...(turn.agentReplies ?? []).map((reply) => reply.content),
          ]
        : [turn.withoutJev?.content];
    const reply = replies.filter(Boolean).join("\n\n");
    return {
      customer: clip(turn.message.content),
      reply: reply ? clip(reply) : null,
    };
  });
}

function ruleContext(turns: ConversationTurn[] = []): RuleContext {
  return { justClarified: turns.at(-1)?.analysis?.decision === "clarify" };
}

/** What a correct answer should have done, from the rules' point of view. */
function expectationFor(input: PipelineInput): Expectation {
  const rules = applyRules(
    readLocally(
      input.maskedText,
      input.masked,
      priorExchanges(input.history, "with_jev"),
    ).classification,
    ruleContext(input.history),
  );
  return { decision: rules.decision, escalate: rules.escalate };
}

async function runJevPath(
  input: PipelineInput,
  settleExpectation: (expectation: Expectation) => void,
): Promise<JevPathResult> {
  const started = performance.now();
  const history = priorExchanges(input.history, "with_jev");
  let reading;
  try {
    reading = await readMessage(input.maskedText, input.masked, history);
  } catch (error) {
    // Jev could not read the message: record it, then still answer the
    // customer through the verified fallback handler.
    const reason = failureReason(error);
    await saveJevFailure(input.messageId, reason);
    settleExpectation(expectationFor(input));
    const draft = await answerFallback(input.maskedText, history).catch(
      (error) => {
        logFailure("Jev fallback answer", error);
        return SAFE_DRAFT;
      },
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
      docCount: draft.docCount,
      ...reviewAnswer("with_jev", content, null),
    });
    return { analysis: null, analysisError: reason, withJev, ticketId: null };
  }

  const ruleStart = performance.now();
  const rules = applyRules(reading.classification, ruleContext(input.history));
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
        refundRequested: reading.classification.refundRequested,
      })
      .catch(() => null);
  }

  if (ticketId)
    baseAnalysis.routeLabel = `${rules.routeLabel} · Tiket ${ticketId}`;

  let handlerError: string | null = null;
  const context = handlerContext(
    rules.route,
    rules.decision,
    input.maskedText,
    history,
    reading.classification.product,
  );
  const draft = await runHandler(
    context,
    input.maskedText,
    ticketId,
    history,
  ).catch((error) => {
    logFailure(`Jev handler (${rules.route})`, error);
    handlerError = failureReason(error);
    return SAFE_DRAFT;
  });
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
          note: handlerError
            ? `${rules.routeLabel} gagal: ${handlerError} Diganti template aman.`
            : rules.routeLabel,
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
      handler: {
        ...context,
        maskedInput: input.masked,
        inputTokens: draft.usage.inputTokens,
        outputTokens: draft.usage.outputTokens,
        latencyMs: draft.latencyMs,
        costUsd: draft.usage.costUsd,
        fallback: handlerError
          ? `Penangan gagal: ${handlerError} Diganti template aman.`
          : check.ok
            ? null
            : `Draf tidak lolos verifikasi (${check.problems.join(", ")}). Diganti template aman.`,
      },
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
    // What the handler was sent, as Debug shows it, even if its call failed.
    docCount: context.docs.length,
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
  let draft: DraftAnswer;
  try {
    draft = await answerBaseline(
      input.rawText,
      priorExchanges(input.history, "without_jev"),
    );
  } catch (error) {
    logFailure("Baseline answer", error);
    // Record why, so every view can stop waiting and Debug can explain it.
    await saveAnswerFailure(input.messageId, {
      mode: "without_jev",
      error: failureReason(error),
      modelId: baselineModelId(),
      latencyMs: since(started),
    }).catch(() => {});
    return null;
  }
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
    docCount: draft.docCount,
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
    logFailure("Baseline path", error);
    return null;
  });
  try {
    const jev = await runJevPath(input, settle);
    return { jev, baseline };
  } catch (error) {
    // Never leave the baseline waiting on an expectation that will not come.
    settle(expectationFor(input));
    throw error;
  }
}
