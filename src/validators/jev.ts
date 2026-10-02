import { z } from "zod";

// Strict shape for a Jev reading before it is stored. Model output is never
// trusted as-is: unknown keys are dropped, scores are clamped by the schema,
// and text fields are bounded.

const unit = z.number().min(0).max(1);
const shortText = z.string().trim().min(1).max(200);

export const jevAnalysisSchema = z.object({
  product: shortText,
  issueType: z.enum([
    "pembayaran",
    "akses_akun",
    "cara_pakai",
    "bug",
    "saran_fitur",
  ]),
  urgency: z.enum(["rendah", "sedang", "tinggi", "mendesak"]),
  frustrationScore: unit,
  churnRisk: unit,
  sensitiveData: z.boolean(),
  injectionDetected: z.boolean(),
  confidence: unit,
  labels: z
    .array(
      z.object({
        label: shortText,
        value: shortText,
        confidence: unit,
        flagged: z.boolean().optional(),
      }),
    )
    .max(12),
  decision: z.enum(["answered", "masked", "blocked", "escalated", "clarify"]),
  route: z.enum([
    "template",
    "fast_model",
    "reasoning_model",
    "escalate",
    "clarify",
  ]),
  routeLabel: shortText,
  routeReason: z.string().trim().min(1).max(1000),
  rules: z.array(z.string().trim().min(1).max(300)).max(10),
  steps: z
    .array(
      z.object({
        name: shortText,
        note: z.string().trim().max(200),
        durationMs: z.number().int().min(0).max(600_000),
      }),
    )
    .max(10),
});

export const jevRunMetaSchema = z.object({
  modelId: z.string().max(200).nullable(),
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  latencyMs: z.number().int().min(0).default(0),
  costUsd: z.number().min(0).default(0),
});

export type JevAnalysisInput = z.infer<typeof jevAnalysisSchema>;
export type JevRunMeta = z.infer<typeof jevRunMetaSchema>;
