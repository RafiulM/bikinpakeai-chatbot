import { asc, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/index.server";
import { testCases, testSets } from "@/db/schema";
import {
  EXPECTED_LABEL_TEXT,
  type ExpectedLabel,
} from "@/lib/lab/test-set-file";
import {
  ISSUE_TYPES,
  type IssueType,
  type TestSetSummary,
} from "@/lib/lab/types";
import type { CreateTestSetInput } from "@/validators/test-sets";

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

  return sets.map((set) =>
    toSummary(
      set,
      labels.filter((row) => row.testSetId === set.id),
    ),
  );
}

/** Uploads one account may keep; older ones must be deleted first. */
export const MAX_UPLOADED_SETS = 20;

/**
 * Saves an uploaded labelled set for the account. Labels that name an issue
 * type also fill the case's category, so the report can filter by it.
 */
export async function createTestSet(
  userId: string,
  input: CreateTestSetInput,
): Promise<{ kind: "limit" } | { kind: "created"; set: TestSetSummary }> {
  return db.transaction(async (tx) => {
    // Serialize uploads per account so the cap holds under concurrent posts.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [{ uploads }] = await tx
      .select({ uploads: count() })
      .from(testSets)
      .where(eq(testSets.userId, userId));
    if (uploads >= MAX_UPLOADED_SETS) return { kind: "limit" };

    const [set] = await tx
      .insert(testSets)
      .values({
        userId,
        name: input.name,
        description: "Diunggah dari berkas.",
      })
      .returning();
    await tx.insert(testCases).values(
      input.cases.map((item, index) => ({
        testSetId: set.id,
        position: index + 1,
        inputText: item.inputText,
        expectedLabel: item.expectedLabel,
        category: (ISSUE_TYPES as readonly string[]).includes(
          item.expectedLabel,
        )
          ? (item.expectedLabel as IssueType)
          : null,
      })),
    );

    const mix = new Map<string, number>();
    for (const item of input.cases)
      mix.set(item.expectedLabel, (mix.get(item.expectedLabel) ?? 0) + 1);
    return {
      kind: "created",
      set: toSummary(
        set,
        [...mix]
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      ),
    };
  });
}

/** Summary shape from a set row and its label counts, most common first. */
function toSummary(
  set: typeof testSets.$inferSelect,
  mix: { label: string; count: number }[],
): TestSetSummary {
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
}
