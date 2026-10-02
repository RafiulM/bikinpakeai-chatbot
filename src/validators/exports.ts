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

export const transcriptExportSchema = z
  .object({
    conversationId: z.string().uuid(),
    format: z.enum(["text", "markdown"]).default("text"),
    labels: z.enum(["full", "brief"]).default("full"),
    baseline: z.enum(["true", "false"]).default("true"),
    /** "1" asks the browser to save the file instead of showing it. */
    download: z.literal("1").optional(),
  })
  .strict();

export type TranscriptExportInput = z.infer<typeof transcriptExportSchema>;
