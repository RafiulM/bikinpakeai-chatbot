import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

const ISSUE_TYPES = sql.raw(
  `('pembayaran', 'akses_akun', 'cara_pakai', 'bug', 'saran_fitur')`,
);

// Labelled messages for the mass test ("Run test set"). A set without an
// owner is a built-in sample shared by every account; an uploaded set belongs
// to the account that uploaded it.
export const testSets = pgTable(
  "test_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").default("").notNull(),
    /** Built-in sets are listed in this order, before uploads. */
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("test_sets_user_created_idx").on(table.userId, table.createdAt),
    check(
      "test_sets_name_check",
      sql`length(trim(${table.name})) between 1 and 120`,
    ),
  ],
);

export const testCases = pgTable(
  "test_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    testSetId: uuid("test_set_id")
      .notNull()
      .references(() => testSets.id, { onDelete: "cascade" }),
    /** Order within the set; results are reported in this order. */
    position: integer("position").notNull(),
    inputText: text("input_text").notNull(),
    expectedLabel: text("expected_label").notNull(),
    /** Issue category for the report filter; null when the label is an action. */
    category: text("category"),
  },
  (table) => [
    uniqueIndex("test_cases_set_position_idx").on(
      table.testSetId,
      table.position,
    ),
    check(
      "test_cases_input_text_check",
      sql`length(${table.inputText}) between 1 and 2000`,
    ),
    check(
      "test_cases_expected_label_check",
      sql`${table.expectedLabel} in ('pembayaran', 'akses_akun', 'cara_pakai', 'bug', 'saran_fitur', 'answered', 'masked', 'blocked', 'escalated', 'clarify')`,
    ),
    check(
      "test_cases_category_check",
      sql`${table.category} is null or ${table.category} in ${ISSUE_TYPES}`,
    ),
  ],
);

// One execution of a test set by one account. Progress is written as each
// message finishes so the screen can follow a run that is still going.
export const testRuns = pgTable(
  "test_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Shown as "Run #<number>". */
    number: integer("number").generatedAlwaysAsIdentity({ startWith: 1 }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    testSetId: uuid("test_set_id")
      .notNull()
      .references(() => testSets.id, { onDelete: "cascade" }),
    status: text("status").default("running").notNull(),
    /** Messages processed so far, out of total. */
    progress: integer("progress").default(0).notNull(),
    total: integer("total").notNull(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("test_runs_user_started_idx").on(
      table.userId,
      table.startedAt.desc(),
    ),
    index("test_runs_set_idx").on(table.testSetId),
    check(
      "test_runs_status_check",
      sql`${table.status} in ('running', 'done', 'failed', 'cancelled')`,
    ),
    check(
      "test_runs_progress_check",
      sql`${table.progress} between 0 and ${table.total} and ${table.total} between 1 and 100`,
    ),
    check(
      "test_runs_finished_at_check",
      sql`(${table.status} = 'running') = (${table.finishedAt} is null)`,
    ),
  ],
);

// How one chatbot version handled one test message in one run.
export const testResults = pgTable(
  "test_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    testRunId: uuid("test_run_id")
      .notNull()
      .references(() => testRuns.id, { onDelete: "cascade" }),
    testCaseId: uuid("test_case_id")
      .notNull()
      .references(() => testCases.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    verdict: text("verdict").notNull(),
    /** What the version did: answered, masked, blocked, escalated, clarify. */
    decision: text("decision"),
    /** Issue type Jev detected; fills the category of unlabelled cases. */
    issueType: text("issue_type"),
    latencyMs: integer("latency_ms").notNull(),
    costUsd: numeric("cost_usd", {
      precision: 12,
      scale: 6,
      mode: "number",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("test_results_run_case_mode_idx").on(
      table.testRunId,
      table.testCaseId,
      table.mode,
    ),
    index("test_results_case_idx").on(table.testCaseId),
    check(
      "test_results_mode_check",
      sql`${table.mode} in ('with_jev', 'without_jev')`,
    ),
    check(
      "test_results_verdict_check",
      sql`${table.verdict} in ('correct', 'wrong', 'escalated')`,
    ),
    check(
      "test_results_decision_check",
      sql`${table.decision} is null or ${table.decision} in ('answered', 'masked', 'blocked', 'escalated', 'clarify')`,
    ),
    check(
      "test_results_issue_type_check",
      sql`${table.issueType} is null or ${table.issueType} in ${ISSUE_TYPES}`,
    ),
    check(
      "test_results_metrics_check",
      sql`${table.latencyMs} >= 0 and ${table.costUsd} >= 0`,
    ),
  ],
);
