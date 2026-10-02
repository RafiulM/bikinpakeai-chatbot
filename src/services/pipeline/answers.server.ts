import { generateText } from "ai";
import {
  knowledgeAsText,
  searchKnowledge,
  SUPPORT_POLICY,
} from "@/lib/lab/knowledge";
import type { HandlerRoute } from "@/lib/lab/types";
import {
  aiConfig,
  LOCAL_MODEL_ID,
  openrouter,
  usageOf,
  type RunUsage,
} from "./ai.server";

// Answer handlers for both paths. The Jev path uses the cheapest handler the
// rules picked; the baseline path always asks one capable model. Both see the
// same knowledge base and policy.

export interface DraftAnswer {
  content: string;
  modelId: string | null;
  latencyMs: number;
  usage: RunUsage;
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
  return { content, modelId: null, latencyMs: 0, usage: NO_USAGE };
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
  };
}

async function modelAnswer(
  modelId: string,
  instructions: string,
  text: string,
): Promise<DraftAnswer> {
  const started = performance.now();
  const result = await generateText({
    model: openrouter().chat(modelId, { usage: { include: true } }),
    instructions,
    prompt: text,
    maxOutputTokens: 400,
    temperature: 0.2,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(aiConfig.modelTimeoutMs),
  });
  return {
    content: result.text.trim(),
    modelId,
    latencyMs: Math.round(performance.now() - started),
    usage: usageOf(result),
  };
}

const JEV_HANDLER_INSTRUCTIONS = (docs: string) =>
  `Kamu asisten customer support Bikinpakeai.\n\nKebijakan:\n${SUPPORT_POLICY}\n\nDokumentasi yang relevan:\n${docs}\n\nJawab maksimal tiga kalimat.`;

/** Runs the handler the rules picked for the Jev path. */
export async function answerWithHandler(
  route: HandlerRoute,
  decision: "answered" | "masked" | "blocked" | "escalated" | "clarify",
  text: string,
  ticketCode: string | null,
): Promise<DraftAnswer> {
  if (decision === "blocked") return template(TEMPLATES.blocked);
  if (decision === "masked") return template(TEMPLATES.masked);
  if (decision === "escalated")
    return template(TEMPLATES.escalated(ticketCode));
  if (decision === "clarify" || route === "clarify")
    return template(TEMPLATES.clarify);
  if (route === "template") return template(TEMPLATES.feature);

  const started = performance.now();
  if (!aiConfig.enabled) return localAnswer(text, started);
  const docs = knowledgeAsText(searchKnowledge(text));
  return modelAnswer(
    route === "reasoning_model"
      ? aiConfig.models.reasoning
      : aiConfig.models.fast,
    JEV_HANDLER_INSTRUCTIONS(docs || knowledgeAsText()),
    text,
  );
}

/** Jev-path fallback when the reading failed: knowledge answer, still verified. */
export async function answerFallback(text: string): Promise<DraftAnswer> {
  const started = performance.now();
  if (!aiConfig.enabled) return localAnswer(text, started);
  return modelAnswer(
    aiConfig.models.fast,
    JEV_HANDLER_INSTRUCTIONS(knowledgeAsText()),
    text,
  );
}

/**
 * The comparison path: one capable model with the same knowledge base and
 * policy text, but no classification, no backend rules, no masking, no
 * routing and no draft verification.
 */
export async function answerBaseline(text: string): Promise<DraftAnswer> {
  const started = performance.now();
  if (!aiConfig.enabled) return localAnswer(text, started);
  return modelAnswer(
    aiConfig.models.baseline,
    `Kamu asisten customer support Bikinpakeai yang ramah dan membantu.\n\nKebijakan:\n${SUPPORT_POLICY}\n\nDokumentasi:\n${knowledgeAsText()}`,
    text,
  );
}
