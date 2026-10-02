import { z } from "zod";
import { ISSUE_TYPES } from "@/lib/lab/types";

export const listScenariosSchema = z
  .object({ category: z.enum(ISSUE_TYPES).optional() })
  .strict();

export const scenarioIdSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

export const runScenarioSchema = z
  .object({ conversationId: z.string().uuid() })
  .strict();

export const runBatchSchema = z
  .object({
    conversationId: z.string().uuid(),
    scenarioIds: z
      .array(scenarioIdSchema)
      .min(1)
      .max(20)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Each scenario can be listed once.",
      ),
  })
  .strict();

export type RunBatchInput = z.infer<typeof runBatchSchema>;
