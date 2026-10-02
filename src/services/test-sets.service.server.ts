import { asc, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/index.server";
import { testCases, testSets } from "@/db/schema";
import {
  EXPECTED_LABEL_TEXT,
  type ExpectedLabel,
} from "@/lib/lab/test-set-file";
import type { TestSetSummary } from "@/lib/lab/types";

// Labelled test sets: built-in samples (no owner) plus the caller's uploads.

/** Sets the account may use: built-in ones, then its own uploads. */
const visibleTo = (userId: string) =>
  or(isNull(testSets.userId), eq(testSets.userId, userId));

/** Every test set the account can run, with case counts and label mix. */
export async function listTestSets(userId: string): Promise<TestSetSummary[]> {
  const sets = await db
    .select()
    .from(testSets)
    .where(visibleTo(userId))
    .orderBy(
      sql`${testSets.userId} is not null`,
      asc(testSets.position),
      desc(testSets.createdAt),
    );
  if (sets.length === 0) return [];

  const labels = await db
    .select({
      testSetId: testCases.testSetId,
      label: testCases.expectedLabel,
      count: count(),
    })
    .from(testCases)
    .where(
      inArray(
        testCases.testSetId,
        sets.map((set) => set.id),
      ),
    )
    .groupBy(testCases.testSetId, testCases.expectedLabel)
    .orderBy(desc(count()), asc(testCases.expectedLabel));

  return sets.map((set) => {
    const mix = labels.filter((row) => row.testSetId === set.id);
    return {
      id: set.id,
      name: set.name,
      description: set.description,
      caseCount: mix.reduce((sum, row) => sum + row.count, 0),
      categories: mix.map(
        (row) => EXPECTED_LABEL_TEXT[row.label as ExpectedLabel] ?? row.label,
      ),
      builtIn: set.userId === null,
    };
  });
}
