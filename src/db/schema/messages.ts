import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations";

// A message inside a conversation. Content is stored already masked when it
// contained sensitive data; the original text is never persisted.
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender: text("sender").notNull(),
    content: text("content").notNull(),
    isMasked: boolean("is_masked").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
    check(
      "messages_sender_check",
      sql`${table.sender} in ('customer', 'bot_with_jev', 'bot_without_jev', 'agent')`,
    ),
    check(
      "messages_content_length_check",
      sql`length(${table.content}) <= 4000`,
    ),
  ],
);
