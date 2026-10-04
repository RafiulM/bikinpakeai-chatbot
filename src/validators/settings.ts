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

export const saveDisplaySettingsSchema = z
  .object({
    demoMode: z.boolean(),
    chatbot: z.enum(["with_jev", "without_jev"]),
  })
  .strict();

export type SaveDisplaySettingsInput = z.infer<
  typeof saveDisplaySettingsSchema
>;

export const seedDemoSchema = z.object({}).strict();
