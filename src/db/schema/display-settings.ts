import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

// How the account's Chat looks. Demo mode shows both answers side by side
// with their review; with demo mode off, Chat looks like the real customer
// chatbot and shows only the chosen path. Both paths always run.
export const accountDisplaySettings = pgTable(
  "account_display_settings",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    demoMode: boolean("demo_mode").default(true).notNull(),
    chatbot: text("chatbot").default("with_jev").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "account_display_settings_chatbot_check",
      sql`${table.chatbot} in ('with_jev', 'without_jev')`,
    ),
  ],
);
