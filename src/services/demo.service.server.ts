import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/index.server";
import { testSets } from "@/db/schema";
import type { DemoSeedResult } from "@/lib/lab/types";
import { startConversation } from "./conversations.service.server";
import { runScenarioBatch } from "./scenarios.service.server";
import { runTestSetsInOrder } from "./test-runs.service.server";

// Demo data for one account, made by the real pipeline (with the account's
// own OpenRouter key when saved): a fresh conversation from ready-made
// scenarios, the tickets they escalate, and a run of every built-in test set.

/** One scenario per decision: answer, mask, block, escalate, template. */
export const DEMO_SCENARIOS = [
  "paid-not-active",
  "card-number",
  "promo-injection",
  "prdtask-password",
  "export-prd",
  "export-deadline",
  "dark-mode",
];

export async function seedDemoData(
  userId: string,
  signal?: AbortSignal,
): Promise<DemoSeedResult> {
  const { conversation } = await startConversation(userId);
  const batch = await runScenarioBatch(
    userId,
    conversation.id,
    DEMO_SCENARIOS,
    signal,
  );
  const results = batch.kind === "ok" ? batch.results : [];

  const builtIn = await db
    .select({ id: testSets.id, name: testSets.name })
    .from(testSets)
    .where(isNull(testSets.userId))
    .orderBy(asc(testSets.position));
  void runTestSetsInOrder(
    userId,
    builtIn.map((set) => set.id),
  ).catch((error) =>
    console.error(
      "Demo test runs failed:",
      error instanceof Error ? error.name : "UnknownError",
    ),
  );

  return {
    conversation: { id: conversation.id, code: conversation.code },
    messages: results.filter((item) => item.status === "done").length,
    tickets: results.filter((item) => item.ticketId).length,
    failed: results.filter((item) => item.status !== "done").length,
    testSets: builtIn.map((set) => set.name),
  };
}
