import { z } from "zod";

/** Tabs of the Konfigurasi Agent screen, in display order. */
export const CONFIG_TABS = [
  "dokumen",
  "instruksi",
  "kebijakan",
  "template",
  "model",
] as const;
export type ConfigTab = (typeof CONFIG_TABS)[number];

// URL contract shared by every Support Lab view: ?c=<conversationId> opens a
// specific conversation directly in any view, and ?rekam=1 turns on the clean
// recording mode. ?tab and ?doc belong to Konfigurasi Agent (the open tab and
// knowledge entry, so Debug can link to one entry); they live here so every
// view keeps one search type, and only c and rekam carry over between views.
export const labSearchSchema = z.object({
  c: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/)
    .optional()
    .catch(undefined),
  rekam: z.literal(1).optional().catch(undefined),
  tab: z.enum(CONFIG_TABS).optional().catch(undefined),
  doc: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
});

export type LabSearch = z.infer<typeof labSearchSchema>;
