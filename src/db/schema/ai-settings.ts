import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./user";

// One account's own OpenRouter key. Only the encrypted key is stored
// (src/lib/secret-box.server.ts); the hint is the last characters, shown so
// the owner can tell which key is saved.
export const accountAiSettings = pgTable("account_ai_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  openrouterKeyEncrypted: text("openrouter_key_encrypted").notNull(),
  openrouterKeyHint: varchar("openrouter_key_hint", { length: 16 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
