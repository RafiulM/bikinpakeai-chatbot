import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/index.server";
import { scenarioCategories, scenarios } from "@/db/schema";
import type { Scenario } from "@/lib/lab/scenarios";
import { publishLabEvent } from "@/lib/lab/events.server";
import type { IssueType } from "@/lib/lab/types";
import { sendCustomerMessage } from "./messaging.service.server";

// Ready-made demo scenarios (shared reference data, not owned by accounts).

function toScenario(row: typeof scenarios.$inferSelect): Scenario {
  return {
    id: row.id,
    name: row.name,
    category: row.categoryId as IssueType,
    prompt: row.prompt,
    expectedIntent: row.expectedIntent ?? "",
    expectedRoute: row.expectedRoute ?? "",
  };
}

/** Categories in display order, each with its scenarios. */
export async function listScenarioGroups(category?: IssueType) {
  const [categories, rows] = await Promise.all([
    db
      .select()
      .from(scenarioCategories)
      .orderBy(asc(scenarioCategories.position)),
    db
      .select()
      .from(scenarios)
      .where(category ? eq(scenarios.categoryId, category) : undefined)
      .orderBy(asc(scenarios.position)),
  ]);
  return categories
    .filter((item) => !category || item.id === category)
    .map((item) => {
      const items = rows
        .filter((row) => row.categoryId === item.id)
        .map(toScenario);
      return {
        id: item.id as IssueType,
        label: item.label,
        count: items.length,
        scenarios: items,
      };
    });
}

export async function getScenario(id: string) {
  const [row] = await db
    .select()
    .from(scenarios)
    .where(eq(scenarios.id, id))
    .limit(1);
  return row ? toScenario(row) : undefined;
}

export interface BatchItemResult {
  scenarioId: string;
  status: "done" | "failed" | "stopped";
  messageId: string | null;
  ticketId: string | null;
  decision: string | null;
}

export type BatchResult =
  | { kind: "ok"; results: BatchItemResult[] }
  | { kind: "unknown_scenarios"; ids: string[] }
  | { kind: "not_found" }
  | { kind: "ended" };

/**
 * Runs several scenarios one after another in the caller's conversation.
 * Each waits for the previous Jev answer; progress goes to the live stream.
 * Stops early when the client disconnects or the conversation ends.
 */
export async function runScenarioBatch(
  userId: string,
  conversationId: string,
  scenarioIds: string[],
  signal?: AbortSignal,
): Promise<BatchResult> {
  const rows = await db
    .select()
    .from(scenarios)
    .where(inArray(scenarios.id, scenarioIds));
  const byId = new Map(rows.map((row) => [row.id, toScenario(row)]));
  const unknown = scenarioIds.filter((id) => !byId.has(id));
  if (unknown.length) return { kind: "unknown_scenarios", ids: unknown };

  const results: BatchItemResult[] = [];
  const announce = (
    index: number,
    state: "running" | "done" | "failed" | "stopped",
    messageId = "",
  ) =>
    publishLabEvent({
      type: "scenario_run",
      conversationId,
      messageId,
      scenarioId: scenarioIds[index],
      index,
      total: scenarioIds.length,
      state,
    });

  for (const [index, id] of scenarioIds.entries()) {
    const scenario = byId.get(id)!;
    if (signal?.aborted) {
      results.push({
        scenarioId: id,
        status: "stopped",
        messageId: null,
        ticketId: null,
        decision: null,
      });
      continue;
    }
    announce(index, "running");
    const sent = await sendCustomerMessage(
      userId,
      conversationId,
      scenario.prompt,
      scenario.id,
    );
    if (sent.kind === "not_found" || sent.kind === "ended") {
      if (index === 0) return sent;
      announce(index, "failed");
      results.push({
        scenarioId: id,
        status: "failed",
        messageId: null,
        ticketId: null,
        decision: null,
      });
      continue;
    }
    const answered = Boolean(sent.turn.withJev);
    announce(index, answered ? "done" : "failed", sent.turn.message.id);
    results.push({
      scenarioId: id,
      status: answered ? "done" : "failed",
      messageId: sent.turn.message.id,
      ticketId: sent.turn.ticketId,
      decision: sent.turn.analysis?.decision ?? null,
    });
  }
  return { kind: "ok", results };
}
