import { AsyncLocalStorage } from "node:async_hooks";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// Model configuration for both answer paths. Every role is an OpenRouter
// model id from the environment, never hardcoded in the pipeline. The API key
// is the account's own (saved in Pengaturan) when the work runs inside
// runWithOpenRouterKey, else OPENROUTER_API_KEY. Without either the lab runs
// in local mode: a deterministic reader and knowledge-base answers, clearly
// marked as such.

const aiEnv = z
  .object({
    OPENROUTER_API_KEY: z.string().trim().min(1).optional(),
    /** Optional proxy or test endpoint for the OpenRouter API. */
    OPENROUTER_BASE_URL: z.url().optional(),
    LAB_JEV_MODEL: z.string().trim().min(1).default("typesafe/jev-1.13"),
    LAB_FAST_MODEL: z.string().trim().min(1).default("openai/gpt-4o-mini"),
    LAB_REASONING_MODEL: z
      .string()
      .trim()
      .min(1)
      .default("anthropic/claude-3.5-sonnet"),
    LAB_BASELINE_MODEL: z
      .string()
      .trim()
      .min(1)
      .default("anthropic/claude-3.5-sonnet"),
    LAB_JEV_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),
    LAB_MODEL_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
  })
  .parse({
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || undefined,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || undefined,
    LAB_JEV_MODEL: process.env.LAB_JEV_MODEL || undefined,
    LAB_FAST_MODEL: process.env.LAB_FAST_MODEL || undefined,
    LAB_REASONING_MODEL: process.env.LAB_REASONING_MODEL || undefined,
    LAB_BASELINE_MODEL: process.env.LAB_BASELINE_MODEL || undefined,
    LAB_JEV_TIMEOUT_MS: process.env.LAB_JEV_TIMEOUT_MS || undefined,
    LAB_MODEL_TIMEOUT_MS: process.env.LAB_MODEL_TIMEOUT_MS || undefined,
  });

const accountKey = new AsyncLocalStorage<{ apiKey: string | null }>();

/**
 * Runs `work` with an account's own OpenRouter key; null falls back to the
 * server key. Everything `work` starts, including background answers, sees it.
 */
export function runWithOpenRouterKey<T>(apiKey: string | null, work: () => T) {
  return accountKey.run({ apiKey }, work);
}

/** The key the work in progress uses: the account's, else the server's. */
export function activeOpenRouterKey() {
  return accountKey.getStore()?.apiKey ?? aiEnv.OPENROUTER_API_KEY ?? null;
}

/** True when OPENROUTER_API_KEY is set for the whole server. */
export const serverKeyConfigured = Boolean(aiEnv.OPENROUTER_API_KEY);

export const OPENROUTER_BASE_URL =
  aiEnv.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export const aiConfig = {
  /** Whether the work in progress can call models (else local mode). */
  get enabled() {
    return activeOpenRouterKey() !== null;
  },
  models: {
    jev: aiEnv.LAB_JEV_MODEL,
    fast: aiEnv.LAB_FAST_MODEL,
    reasoning: aiEnv.LAB_REASONING_MODEL,
    baseline: aiEnv.LAB_BASELINE_MODEL,
  },
  jevTimeoutMs: aiEnv.LAB_JEV_TIMEOUT_MS,
  modelTimeoutMs: aiEnv.LAB_MODEL_TIMEOUT_MS,
} as const;

export const LOCAL_MODEL_ID = "lokal/tanpa-openrouter";

const providers = new Map<string, ReturnType<typeof createOpenRouter>>();

/** The OpenRouter provider for the active key (one client per key). */
export function openrouter() {
  const apiKey = activeOpenRouterKey();
  if (!apiKey) throw new Error("No OpenRouter key is configured.");
  let provider = providers.get(apiKey);
  if (!provider) {
    provider = createOpenRouter({
      apiKey,
      appName: "Bikinpakeai Support Lab",
      ...(aiEnv.OPENROUTER_BASE_URL && {
        baseURL: aiEnv.OPENROUTER_BASE_URL,
        decisionsBaseURL: aiEnv.OPENROUTER_BASE_URL,
      }),
    });
    providers.set(apiKey, provider);
  }
  return provider;
}

export interface RunUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/** Token counts from the AI SDK plus OpenRouter's reported cost. */
export function usageOf(result: {
  usage?: { inputTokens?: number; outputTokens?: number };
  providerMetadata?: Record<string, unknown>;
}): RunUsage {
  const openrouterMeta = result.providerMetadata?.openrouter as
    { usage?: { cost?: number } } | undefined;
  return {
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    costUsd: Number(openrouterMeta?.usage?.cost ?? 0),
  };
}

/** Short, user-safe description of a model failure (no secrets, no URLs). */
export function failureReason(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError")
    return "Model tidak merespons dalam batas waktu.";
  if (error instanceof Error && /abort/i.test(error.name))
    return "Pemanggilan model dibatalkan karena terlalu lama.";
  return "Model tidak bisa dihubungi saat ini.";
}
