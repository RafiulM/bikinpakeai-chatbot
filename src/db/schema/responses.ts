import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { messages } from "./messages";

// The two answers to one customer message: with Jev and without Jev. Each row
// also stores how the answer was judged, so Compare can rebuild its numbers.
export const responses = pgTable(
  "responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    content: text("content").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6, mode: "number" })
      .default(0)
      .notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    /** OpenRouter model id that produced the final answer, when a model ran. */
    modelId: text("model_id"),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    verdict: text("verdict").notNull(),
    verdictLabel: text("verdict_label").notNull(),
    issues: jsonb("issues").$type<string[]>().default([]).notNull(),
    flags: jsonb("flags")
      .$type<("security" | "policy" | "missed_escalation")[]>()
      .default([])
      .notNull(),
    highlight: text("highlight"),
    highlightTone: text("highlight_tone"),
    /** One-line comparison takeaway, kept on the with-Jev row. */
    takeaway: text("takeaway"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("responses_message_mode_idx").on(table.messageId, table.mode),
    index("responses_message_idx").on(table.messageId),
    check(
      "responses_mode_check",
      sql`${table.mode} in ('with_jev', 'without_jev')`,
    ),
    check(
      "responses_verdict_check",
      sql`${table.verdict} in ('correct', 'wrong', 'escalated')`,
    ),
    check(
      "responses_highlight_tone_check",
      sql`${table.highlightTone} is null or ${table.highlightTone} in ('good', 'bad')`,
    ),
    check(
      "responses_metrics_check",
      sql`${table.latencyMs} >= 0 and ${table.costUsd} >= 0 and ${table.inputTokens} >= 0 and ${table.outputTokens} >= 0`,
    ),
  ],
);
