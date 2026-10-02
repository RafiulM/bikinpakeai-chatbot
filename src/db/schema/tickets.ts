import { sql } from "drizzle-orm";
import {
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
  varchar,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { messages } from "./messages";

const score = (name: string) =>
  numeric(name, { precision: 4, scale: 3, mode: "number" });

// A conversation escalated by Jev to the human support team (Agent view).
// Ownership follows the conversation, which belongs to one account.
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Shown as "T-<number>". */
    number: integer("number").generatedAlwaysAsIdentity({ startWith: 201 }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    priority: text("priority").notNull(),
    status: text("status").default("open").notNull(),
    claimedBy: varchar("claimed_by", { length: 80 }),
    product: text("product").notNull(),
    issueLabel: text("issue_label").notNull(),
    frustrationScore: score("frustration_score").default(0).notNull(),
    churnRisk: score("churn_risk").default(0).notNull(),
    summary: text("summary").notNull(),
    summaryPoints: jsonb("summary_points")
      .$type<string[]>()
      .default([])
      .notNull(),
    nextStep: text("next_step").notNull(),
    escalationReason: text("escalation_reason").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("tickets_message_idx").on(table.messageId),
    index("tickets_conversation_idx").on(table.conversationId),
    index("tickets_status_created_idx").on(table.status, table.createdAt),
    check(
      "tickets_priority_check",
      sql`${table.priority} in ('urgent', 'high', 'medium', 'low')`,
    ),
    check(
      "tickets_status_check",
      sql`${table.status} in ('open', 'claimed', 'closed')`,
    ),
    check(
      "tickets_scores_check",
      sql`${table.frustrationScore} between 0 and 1 and ${table.churnRisk} between 0 and 1`,
    ),
    check(
      "tickets_closed_at_check",
      sql`(${table.status} = 'closed') = (${table.closedAt} is not null)`,
    ),
  ],
);

export const ticketReplies = pgTable(
  "ticket_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    agentName: varchar("agent_name", { length: 80 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ticket_replies_ticket_created_idx").on(
      table.ticketId,
      table.createdAt,
    ),
    check(
      "ticket_replies_content_check",
      sql`length(${table.content}) between 1 and 2000`,
    ),
  ],
);
