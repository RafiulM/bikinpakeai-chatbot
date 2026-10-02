import { z } from "zod";
import { ISSUE_TYPES } from "@/lib/lab/types";

export const listScenariosSchema = z
  .object({ category: z.enum(ISSUE_TYPES).optional() })
  .strict();

export const scenarioIdSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

export const runScenarioSchema = z
  .object({ conversationId: z.string().uuid() })
  .strict();
