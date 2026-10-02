import { eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { jevAnalyses, messages } from "@/db/schema";
import { publishLabEvent } from "@/lib/lab/events.server";
import type { JevAnalysis } from "@/lib/lab/types";
import {
  jevAnalysisSchema,
  jevRunMetaSchema,
  type JevAnalysisInput,
  type JevRunMeta,
} from "@/validators/jev";

// Stores what Jev read from a customer message and tells live viewers. The
// caller (the answer pipeline) has already checked who owns the message.

type AnalysisRow = typeof jevAnalyses.$inferSelect;

export function toJevAnalysis(row: AnalysisRow): JevAnalysis | null {
  if (row.status !== "done" || !row.decision || !row.route || !row.issueType)
    return null;
  return {
    messageId: row.messageId,
    product: row.product ?? "Tidak diketahui",
    issueType: row.issueType as JevAnalysis["issueType"],
    urgency: (row.urgency ?? "sedang") as JevAnalysis["urgency"],
    frustrationScore: row.frustrationScore ?? 0,
    churnRisk: row.churnRisk ?? 0,
    sensitiveData: row.sensitiveData,
    injectionDetected: row.injectionDetected,
    confidence: row.confidence ?? 0,
    labels: row.labels,
    decision: row.decision as JevAnalysis["decision"],
    route: row.route as JevAnalysis["route"],
    routeLabel: row.routeLabel ?? row.route,
    routeReason: row.routeReason ?? "",
    rules: row.rules,
    steps: row.steps,
  };
}

async function conversationOf(messageId: string) {
  const [message] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  return message?.conversationId;
}

/** Saves (or replaces) a successful reading for one message. */
export async function saveJevAnalysis(
  messageId: string,
  input: JevAnalysisInput,
  meta: JevRunMeta,
  ticketId?: string | null,
) {
  const analysis = jevAnalysisSchema.parse(input);
  const run = jevRunMetaSchema.parse(meta);
  const values = {
    messageId,
    status: "done",
    error: null,
    ...analysis,
    ...run,
  };
  const [row] = await db
    .insert(jevAnalyses)
    .values(values)
    .onConflictDoUpdate({ target: jevAnalyses.messageId, set: values })
    .returning();
  const saved = toJevAnalysis(row);
  const conversationId = await conversationOf(messageId);
  if (saved && conversationId)
    publishLabEvent({
      type: "analysis",
      conversationId,
      messageId,
      analysis: saved,
      ticketId: ticketId ?? null,
    });
  return saved;
}

/** Records that Jev could not read a message, with a user-safe reason. */
export async function saveJevFailure(
  messageId: string,
  error: string,
  meta: Partial<JevRunMeta> = {},
) {
  const reason = error.slice(0, 300);
  const run = jevRunMetaSchema.parse({ modelId: null, ...meta });
  const values = {
    messageId,
    status: "failed",
    error: reason,
    decision: null,
    route: null,
    issueType: null,
    labels: [],
    rules: [],
    steps: [],
    ...run,
  };
  await db
    .insert(jevAnalyses)
    .values(values)
    .onConflictDoUpdate({ target: jevAnalyses.messageId, set: values });
  const conversationId = await conversationOf(messageId);
  if (conversationId)
    publishLabEvent({
      type: "analysis_failed",
      conversationId,
      messageId,
      error: reason,
    });
}
