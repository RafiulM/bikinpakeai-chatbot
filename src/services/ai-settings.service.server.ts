import { eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { accountAiSettings } from "@/db/schema";
import type {
  AiSettings,
  OpenRouterKeyCheck,
  OpenRouterKeySource,
} from "@/lib/lab/types";
import { openSecret, sealSecret } from "@/lib/secret-box.server";
import {
  activeOpenRouterKey,
  aiConfig,
  OPENROUTER_BASE_URL,
  runWithOpenRouterKey,
  serverKeyConfigured,
} from "./pipeline/ai.server";

// An account's own OpenRouter key: stored encrypted, never returned to the
// browser, and used for that account's conversations, tickets and tests.

const PURPOSE = "openrouter-key";

async function savedKey(userId: string) {
  const [row] = await db
    .select()
    .from(accountAiSettings)
    .where(eq(accountAiSettings.userId, userId))
    .limit(1);
  if (!row) return null;
  return { row, apiKey: openSecret(row.openrouterKeyEncrypted, PURPOSE) };
}

/** The account's decrypted key, or null to fall back to the server key. */
async function accountKey(userId: string) {
  return (await savedKey(userId))?.apiKey ?? null;
}

/** Runs `work` (and everything it starts) with the account's own key. */
export async function withAccountAi<T>(
  userId: string,
  work: () => Promise<T>,
): Promise<T> {
  return runWithOpenRouterKey(await accountKey(userId), work);
}

function sourceOf(apiKey: string | null): OpenRouterKeySource {
  return apiKey ? "account" : serverKeyConfigured ? "server" : "none";
}

export async function getAiSettings(userId: string): Promise<AiSettings> {
  const saved = await savedKey(userId);
  return {
    source: sourceOf(saved?.apiKey ?? null),
    accountKey: saved
      ? {
          hint: saved.row.openrouterKeyHint,
          updatedAt: saved.row.updatedAt.toISOString(),
        }
      : null,
    accountKeyUnreadable: !!saved && saved.apiKey === null,
    serverKey: serverKeyConfigured,
    models: { ...aiConfig.models },
  };
}

/** Saves or replaces the account's key. */
export async function saveOpenRouterKey(userId: string, apiKey: string) {
  const values = {
    openrouterKeyEncrypted: sealSecret(apiKey, PURPOSE),
    openrouterKeyHint: `…${apiKey.slice(-4)}`,
  };
  await db
    .insert(accountAiSettings)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: accountAiSettings.userId, set: values });
  return getAiSettings(userId);
}

export async function deleteOpenRouterKey(userId: string) {
  await db
    .delete(accountAiSettings)
    .where(eq(accountAiSettings.userId, userId));
  return getAiSettings(userId);
}

const keyInfo = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Asks OpenRouter whether the key in use works and how much credit it has.
 * Only the key's own account data is read; nothing is billed.
 */
export async function checkOpenRouterKey(
  userId: string,
): Promise<OpenRouterKeyCheck> {
  const own = await accountKey(userId);
  const source = sourceOf(own);
  const apiKey = runWithOpenRouterKey(own, activeOpenRouterKey);
  if (!apiKey) return { status: "none" };
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403)
      return { status: "rejected", source };
    if (!response.ok) return { status: "unreachable", source };
    const body = (await response.json()) as {
      data?: Record<string, unknown>;
    };
    const data = body.data ?? {};
    return {
      status: "ok",
      source,
      label: typeof data.label === "string" ? data.label : null,
      usageUsd: keyInfo(data.usage) ?? 0,
      limitRemainingUsd: keyInfo(data.limit_remaining),
      freeTier: data.is_free_tier === true,
    };
  } catch {
    return { status: "unreachable", source };
  }
}
