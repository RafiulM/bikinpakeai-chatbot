import { z } from "zod";

// URL contract shared by every Support Lab view: ?c=<conversationId> opens a
// specific conversation directly in any view.
export const labSearchSchema = z.object({
  c: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/)
    .optional()
    .catch(undefined),
});

export type LabSearch = z.infer<typeof labSearchSchema>;
