import { z } from "zod";

export const saveOpenRouterKeySchema = z
  .object({
    apiKey: z
      .string()
      .trim()
      .regex(
        /^sk-or-[A-Za-z0-9_-]{16,200}$/,
        "Kunci OpenRouter diawali sk-or- dan tanpa spasi.",
      ),
  })
  .strict();

export type SaveOpenRouterKeyInput = z.infer<typeof saveOpenRouterKeySchema>;

export const seedDemoSchema = z.object({}).strict();
