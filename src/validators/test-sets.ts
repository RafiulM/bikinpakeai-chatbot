import { z } from "zod";
import { EXPECTED_LABELS, MAX_CASES } from "@/lib/lab/test-set-file";
import { ISSUE_TYPES } from "@/lib/lab/types";

// Same limits as the browser parser in src/lib/lab/test-set-file.ts.
export const createTestSetSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    cases: z
      .array(
        z
          .object({
            inputText: z.string().trim().min(1).max(2000),
            expectedLabel: z.enum(EXPECTED_LABELS),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_CASES),
  })
  .strict();

export type CreateTestSetInput = z.infer<typeof createTestSetSchema>;

export const testRunIdSchema = z.string().uuid();

export const startTestRunSchema = z
  .object({ testSetId: z.string().uuid() })
  .strict();

export const listTestRunsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(["running", "done", "failed", "cancelled"]).optional(),
  })
  .strict();

export const comparisonQuerySchema = z
  .object({ category: z.enum(ISSUE_TYPES).optional() })
  .strict();
