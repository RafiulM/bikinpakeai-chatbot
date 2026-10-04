import { generateText, type ModelMessage } from "ai";
import {
  KNOWLEDGE,
  knowledgeAsText,
  productKnowledge,
  searchKnowledge,
  SUPPORT_POLICY,
  type KnowledgeEntry,
} from "@/lib/lab/knowledge";
import type {
  ContextDoc,
  Decision,
  HandlerContext,
  HandlerRoute,
  PriorExchange,
  TemplateId,
} from "@/lib/lab/types";
import {
  aiConfig,
  BUDGETED_REASONING,
  LOCAL_MODEL_ID,
  NO_REASONING,
  openrouter,
  REASONING_BUDGET_TOKENS,
  usageOf,
  type RunUsage,
} from "./ai.server";

// Answer handlers for both paths. The Jev path uses the cheapest handler the
// rules picked; the baseline path always asks one capable model. Both see the
// same knowledge base and policy, plus their own earlier exchanges.

export interface DraftAnswer {
  content: string;
  modelId: string | null;
  latencyMs: number;
  usage: RunUsage;
  /** Knowledge entries the handler was given; 0 for a template. */
  docCount: number;
}

const NO_USAGE: RunUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

/** Fixed replies that need no model at all. */
export const TEMPLATES = {
  blocked:
    "Saya tidak bisa memenuhi permintaan itu. Promo resmi selalu diumumkan di halaman Harga Bikinpakeai. Ada yang bisa saya bantu terkait produk atau akun Anda?",
  masked:
    "Demi keamanan, data sensitif di pesan Anda sudah saya samarkan dan tidak disimpan. Untuk pengecekan pembayaran cukup nomor invoice dari email pembayaran, tidak perlu data kartu.",
  escalated: (ticketCode: string | null) =>
    `Saya paham ini mengecewakan, maaf atas ketidaknyamanannya. Kasus Anda sudah saya teruskan ke tim support${ticketCode ? ` (tiket ${ticketCode})` : ""} dengan prioritas tinggi. Tim akan membalas di percakapan ini.`,
  clarify:
    "Supaya saya bisa membantu dengan tepat, boleh jelaskan sedikit lagi? Misalnya produk yang dipakai (PRDTask, DesainPakeAI, AndalAI, Template, membership, atau komunitas) dan apa yang terjadi.",
  feature:
    "Terima kasih atas sarannya! Usulan ini sudah saya catat dan teruskan ke tim produk Bikinpakeai.",
  safeFallback:
    "Terima kasih, pesan Anda sudah kami terima. Tim support akan memeriksa dan membalas di percakapan ini. Untuk pengecekan pembayaran, cukup kirim nomor invoice.",
} as const;

function template(content: string): DraftAnswer {
  return { content, modelId: null, latencyMs: 0, usage: NO_USAGE, docCount: 0 };
}

/** Knowledge-base answer used in local mode, honest about its source. */
function localAnswer(text: string, started: number): DraftAnswer {
  const [entry] = searchKnowledge(text, 1);
  return {
    content: entry
      ? entry.answer
      : "Terima kasih atas pertanyaannya. Saya belum menemukan jawabannya di dokumentasi Bikinpakeai.",
    modelId: LOCAL_MODEL_ID,
    latencyMs: Math.round(performance.now() - started),
    usage: NO_USAGE,
    docCount: entry ? 1 : 0,
  };
}

export const ANSWER_MAX_TOKENS = 400;
export const ANSWER_TEMPERATURE = 0.2;
/** Most knowledge entries a Jev handler gets when keywords match. */
export const JEV_DOC_LIMIT = 3;

/**
 * Earlier exchanges as chat messages, then the new customer message. An
 * exchange still without a reply (the baseline may lag behind) is left out:
 * two customer messages in a row make the model answer the older one.
 */
function conversationPrompt(
  text: string,
  history: PriorExchange[],
): string | ModelMessage[] {
  const answered = history.filter((turn) => turn.reply);
  if (answered.length === 0) return text;
  return [
    ...answered.flatMap((turn): ModelMessage[] => [
      { role: "user", content: turn.customer },
      { role: "assistant", content: turn.reply ?? "" },
    ]),
    { role: "user", content: text },
  ];
}

/** Knowledge lookup that also uses the previous question for follow-ups. */
function docsFor(text: string, history: PriorExchange[], product?: string) {
  const query = [history.at(-1)?.customer, text].filter(Boolean).join("\n");
  return searchKnowledge(query, JEV_DOC_LIMIT, product);
}

/**
 * The entries a Jev handler gets: the matching ones; when nothing matched,
 * only the product Jev read; the whole knowledge base as the last resort.
 */
function jevDocs(text: string, history: PriorExchange[], product?: string) {
  const matched = docsFor(text, history, product);
  if (matched.length) return { scope: "relevant" as const, entries: matched };
  const scoped = product ? productKnowledge(product) : [];
  if (scoped.length) return { scope: "product" as const, entries: scoped };
  return { scope: "all" as const, entries: KNOWLEDGE };
}

const docRef = ({ id, product, topic }: KnowledgeEntry): ContextDoc => ({
  id,
  product,
  topic,
});

async function modelAnswer(
  modelId: string,
  instructions: string,
  docCount: number,
  text: string,
  thinking: boolean,
  history: PriorExchange[],
): Promise<DraftAnswer> {
  const started = performance.now();
  const result = await generateText({
    model: openrouter().chat(modelId, {
      usage: { include: true },
      reasoning: thinking ? BUDGETED_REASONING : NO_REASONING,
    }),
    instructions,
    prompt: conversationPrompt(text, history),
    maxOutputTokens:
      ANSWER_MAX_TOKENS + (thinking ? REASONING_BUDGET_TOKENS : 0),
    temperature: ANSWER_TEMPERATURE,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(aiConfig.modelTimeoutMs),
  });
  return {
    content: result.text.trim(),
    modelId,
    latencyMs: Math.round(performance.now() - started),
    usage: usageOf(result),
    docCount,
  };
}

/** System instructions for a Jev handler model. */
export const JEV_HANDLER_INSTRUCTIONS = (
  docs: string,
  policy = SUPPORT_POLICY,
) =>
  `Kamu asisten customer support Bikinpakeai.\n\nKebijakan:\n${policy}\n\nDokumentasi yang relevan:\n${docs}\n\nJawab maksimal tiga kalimat. Utamakan menjawab dari dokumentasi dan percakapan sebelumnya; bila memang perlu info tambahan, tanyakan satu hal yang spesifik.`;

/** System instructions for the baseline model: the whole knowledge base. */
export const BASELINE_INSTRUCTIONS = (
  docs = knowledgeAsText(),
  policy = SUPPORT_POLICY,
) =>
  `Kamu asisten customer support Bikinpakeai yang ramah dan membantu.\n\nKebijakan:\n${policy}\n\nDokumentasi:\n${docs}`;

/** The fixed reply a decision or route calls for, if no model is needed. */
function templateFor(
  route: HandlerRoute,
  decision: Decision,
): TemplateId | null {
  if (decision === "blocked") return "blocked";
  if (decision === "masked") return "masked";
  if (decision === "escalated") return "escalated";
  if (decision === "clarify" || route === "clarify") return "clarify";
  if (route === "template") return "feature";
  return null;
}

/**
 * What the handler the rules picked will be given: template, or model with
 * its settings, policy, knowledge entries and history. Worked out before the
 * handler runs, so Debug can show it even when the model call fails.
 */
export function handlerContext(
  route: HandlerRoute,
  decision: Decision,
  text: string,
  history: PriorExchange[] = [],
  product?: string,
): HandlerContext {
  const unused: Omit<HandlerContext, "kind"> = {
    template: null,
    modelId: null,
    reasoningTokens: 0,
    maxOutputTokens: null,
    temperature: null,
    policy: false,
    docScope: "none",
    docs: [],
    history: 0,
  };
  const fixed = templateFor(route, decision);
  if (fixed) return { ...unused, kind: "template", template: fixed };
  if (!aiConfig.enabled) {
    // Local mode answers with the single best knowledge entry.
    const docs = searchKnowledge(text, 1).map(docRef);
    return {
      ...unused,
      kind: "local",
      modelId: LOCAL_MODEL_ID,
      docScope: docs.length ? "relevant" : "none",
      docs,
    };
  }
  const docs = jevDocs(text, history, product);
  const thinking = route === "reasoning_model";
  return {
    kind: "model",
    template: null,
    modelId: thinking ? aiConfig.models.reasoning : aiConfig.models.fast,
    reasoningTokens: thinking ? REASONING_BUDGET_TOKENS : 0,
    maxOutputTokens: ANSWER_MAX_TOKENS,
    temperature: ANSWER_TEMPERATURE,
    policy: true,
    docScope: docs.scope,
    docs: docs.entries.map(docRef),
    history: history.filter((turn) => turn.reply).length,
  };
}

/** Runs the handler described by `context` for the Jev path. */
export async function runHandler(
  context: HandlerContext,
  text: string,
  ticketCode: string | null,
  history: PriorExchange[] = [],
): Promise<DraftAnswer> {
  if (context.kind === "template") {
    const id = context.template ?? "safeFallback";
    return template(
      id === "escalated" ? TEMPLATES.escalated(ticketCode) : TEMPLATES[id],
    );
  }
  const started = performance.now();
  if (context.kind === "local" || !context.modelId)
    return localAnswer(text, started);
  const entries = context.docs.flatMap(
    (doc) => KNOWLEDGE.find((entry) => entry.id === doc.id) ?? [],
  );
  return modelAnswer(
    context.modelId,
    JEV_HANDLER_INSTRUCTIONS(knowledgeAsText(entries)),
    entries.length,
    text,
    context.reasoningTokens > 0,
    history,
  );
}

/** Runs the handler the rules picked for the Jev path. */
export async function answerWithHandler(
  route: HandlerRoute,
  decision: Decision,
  text: string,
  ticketCode: string | null,
  history: PriorExchange[] = [],
  product?: string,
): Promise<DraftAnswer> {
  return runHandler(
    handlerContext(route, decision, text, history, product),
    text,
    ticketCode,
    history,
  );
}

/** Jev-path fallback when the reading failed: knowledge answer, still verified. */
export async function answerFallback(
  text: string,
  history: PriorExchange[] = [],
): Promise<DraftAnswer> {
  const started = performance.now();
  if (!aiConfig.enabled) return localAnswer(text, started);
  const { entries } = jevDocs(text, history);
  return modelAnswer(
    aiConfig.models.fast,
    JEV_HANDLER_INSTRUCTIONS(knowledgeAsText(entries)),
    entries.length,
    text,
    false,
    history,
  );
}

/** The model the baseline path calls, or the local engine without a key. */
export function baselineModelId() {
  return aiConfig.enabled ? aiConfig.models.baseline : LOCAL_MODEL_ID;
}

/**
 * The comparison path: one capable model with the same knowledge base and
 * policy text, but no classification, no backend rules, no masking, no
 * routing and no draft verification.
 */
export async function answerBaseline(
  text: string,
  history: PriorExchange[] = [],
): Promise<DraftAnswer> {
  const started = performance.now();
  if (!aiConfig.enabled) return localAnswer(text, started);
  return modelAnswer(
    aiConfig.models.baseline,
    BASELINE_INSTRUCTIONS(),
    KNOWLEDGE.length,
    text,
    true,
    history,
  );
}
