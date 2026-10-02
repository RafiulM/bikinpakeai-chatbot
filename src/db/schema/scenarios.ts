import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

// Ready-made demo cases. Reference data shared by every account, seeded by a
// migration; the slug ids match src/lib/lab/scenarios.ts.

export const scenarioCategories = pgTable(
  "scenario_categories",
  {
    id: text("id").primaryKey(),
    label: varchar("label", { length: 60 }).notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    check(
      "scenario_categories_id_check",
      sql`${table.id} in ('pembayaran', 'akses_akun', 'cara_pakai', 'bug', 'saran_fitur')`,
    ),
  ],
);

export const scenarios = pgTable(
  "scenarios",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => scenarioCategories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 120 }).notNull(),
    prompt: text("prompt").notNull(),
    expectedIntent: varchar("expected_intent", { length: 80 }),
    expectedRoute: varchar("expected_route", { length: 80 }),
    position: integer("position").notNull(),
  },
  (table) => [
    index("scenarios_category_position_idx").on(
      table.categoryId,
      table.position,
    ),
    check("scenarios_id_check", sql`${table.id} ~ '^[a-z0-9-]+$'`),
    check(
      "scenarios_prompt_check",
      sql`length(${table.prompt}) between 1 and 2000`,
    ),
  ],
);
