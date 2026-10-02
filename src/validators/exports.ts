import { z } from "zod";

export const summaryExportSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    /** A run id, or "latest" for the newest finished run. */
    testRun: z.union([z.literal("latest"), z.string().uuid()]).optional(),
    format: z.enum(["markdown", "json"]).default("markdown"),
  })
  .strict()
  .refine((input) => input.conversationId || input.testRun, {
    message: "Choose a conversation, a test run, or both.",
    path: ["conversationId"],
  });

export type SummaryExportInput = z.infer<typeof summaryExportSchema>;
