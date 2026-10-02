import { z } from "zod";
import { EXPECTED_LABELS, MAX_CASES } from "@/lib/lab/test-set-file";

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
