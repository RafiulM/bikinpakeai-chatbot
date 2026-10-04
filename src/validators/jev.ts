import { z } from "zod";

// Strict shape for a Jev reading before it is stored. Model output is never
// trusted as-is: unknown keys are dropped, scores are clamped by the schema,
// and text fields are bounded.

const unit = z.number().min(0).max(1);
const shortText = z.string().trim().min(1).max(200);

const count = z.number().int().min(0);

/** What the chosen handler was given; names and counts only, never text. */
export const handlerTraceSchema = z.object({
  kind: z.enum(["template", "model", "local"]),
  template: z
    .enum([
      "blocked",
      "masked",
      "escalated",
      "clarify",
      "feature",
      "safeFallback",
    ])
    .nullable(),
  modelId: z.string().max(200).nullable(),
  reasoningTokens: count.max(100_000),
  maxOutputTokens: count.max(100_000).nullable(),
  temperature: z.number().min(0).max(2).nullable(),
  policy: z.boolean(),
  docScope: z.enum(["relevant", "product", "all", "none"]),
  // Room for the whole knowledge base, which "all" sends.
  docs: z
    .array(z.object({ id: shortText, product: shortText, topic: shortText }))
    .max(200),
  history: count.max(100),
  maskedInput: z.boolean(),
  inputTokens: count,
  outputTokens: count,
  latencyMs: count.max(600_000),
  costUsd: z.number().min(0),
  fallback: z.string().trim().min(1).max(300).nullable(),
});

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
  handler: handlerTraceSchema.nullable().default(null),
});

export const jevRunMetaSchema = z.object({
  modelId: z.string().max(200).nullable(),
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  latencyMs: z.number().int().min(0).default(0),
  costUsd: z.number().min(0).default(0),
});

export type JevAnalysisInput = z.input<typeof jevAnalysisSchema>;
export type JevRunMeta = z.infer<typeof jevRunMetaSchema>;
