import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { messages } from "./messages";

// An answer path that produced no answer for a customer message: which path,
// the model it tried, how long it ran, and a user-safe reason. The answer
// itself, when one exists, lives in responses.
export const answerFailures = pgTable(
  "answer_failures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    modelId: text("model_id"),
    latencyMs: integer("latency_ms").default(0).notNull(),
    error: text("error").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("answer_failures_message_mode_idx").on(
      table.messageId,
      table.mode,
    ),
    check(
      "answer_failures_mode_check",
      sql`${table.mode} in ('with_jev', 'without_jev')`,
    ),
    check("answer_failures_latency_check", sql`${table.latencyMs} >= 0`),
  ],
);
