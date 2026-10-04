import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { HandlerTrace, LabelScore, PipelineStep } from "@/lib/lab/types";
import { messages } from "./messages";

const score = (name: string) =>
  numeric(name, { precision: 4, scale: 3, mode: "number" });

// How Jev read one customer message: labels with confidence, the backend
// decision, the chosen handler and why, what that handler was given, and how
// long each step took.
export const jevAnalyses = pgTable(
  "jev_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    /** "done" when the classification succeeded, "failed" otherwise. */
    status: text("status").default("done").notNull(),
    error: text("error"),
    product: text("product"),
    issueType: text("issue_type"),
    urgency: text("urgency"),
    frustrationScore: score("frustration_score"),
    churnRisk: score("churn_risk"),
    sensitiveData: boolean("sensitive_data").default(false).notNull(),
    injectionDetected: boolean("injection_detected").default(false).notNull(),
    confidence: score("confidence"),
    labels: jsonb("labels").$type<LabelScore[]>().default([]).notNull(),
    decision: text("decision"),
    route: text("route"),
    routeLabel: text("route_label"),
    routeReason: text("route_reason"),
    rules: jsonb("rules").$type<string[]>().default([]).notNull(),
    steps: jsonb("steps").$type<PipelineStep[]>().default([]).notNull(),
    /** Context, model and settings the chosen handler used; null on failure. */
    handler: jsonb("handler").$type<HandlerTrace>(),
    /** OpenRouter model used for the single classification call. */
    modelId: text("model_id"),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    latencyMs: integer("latency_ms").default(0).notNull(),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6, mode: "number" })
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("jev_analyses_message_idx").on(table.messageId),
    check(
      "jev_analyses_status_check",
      sql`${table.status} in ('done', 'failed')`,
    ),
    check(
      "jev_analyses_issue_type_check",
      sql`${table.issueType} is null or ${table.issueType} in ('pembayaran', 'akses_akun', 'cara_pakai', 'bug', 'saran_fitur')`,
    ),
    check(
      "jev_analyses_urgency_check",
      sql`${table.urgency} is null or ${table.urgency} in ('rendah', 'sedang', 'tinggi', 'mendesak')`,
    ),
    check(
      "jev_analyses_decision_check",
      sql`${table.decision} is null or ${table.decision} in ('answered', 'masked', 'blocked', 'escalated', 'clarify')`,
    ),
    check(
      "jev_analyses_route_check",
      sql`${table.route} is null or ${table.route} in ('template', 'fast_model', 'reasoning_model', 'escalate', 'clarify')`,
    ),
    check(
      "jev_analyses_scores_check",
      sql`(${table.frustrationScore} is null or ${table.frustrationScore} between 0 and 1) and (${table.churnRisk} is null or ${table.churnRisk} between 0 and 1) and (${table.confidence} is null or ${table.confidence} between 0 and 1)`,
    ),
    check(
      "jev_analyses_done_fields_check",
      sql`${table.status} = 'failed' or (${table.decision} is not null and ${table.route} is not null and ${table.issueType} is not null)`,
    ),
  ],
);
