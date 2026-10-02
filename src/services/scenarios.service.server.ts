import { asc, eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { scenarioCategories, scenarios } from "@/db/schema";
import type { Scenario } from "@/lib/lab/scenarios";
import type { IssueType } from "@/lib/lab/types";

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
