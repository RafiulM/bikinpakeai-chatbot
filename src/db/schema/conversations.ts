import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

// One support conversation. Every view (Customer, Debug, Compare, Agent)
// reads the same conversation; it belongs to the signed-in account.
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Human-friendly number shown as the code "#A-<number>". */
    number: integer("number").generatedAlwaysAsIdentity({ startWith: 1001 }),
    title: varchar("title", { length: 160 })
      .default("Percakapan baru")
      .notNull(),
    status: text("status").default("active").notNull(),
    /** Last view opened for this conversation, restored when it is reopened. */
    activeView: text("active_view").default("customer").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("conversations_user_created_id_idx").on(
      table.userId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check(
      "conversations_status_check",
      sql`${table.status} in ('active', 'ended')`,
    ),
    check(
      "conversations_active_view_check",
      sql`${table.activeView} in ('customer', 'debug', 'compare', 'agent')`,
    ),
  ],
);
