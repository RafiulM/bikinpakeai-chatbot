CREATE TABLE "test_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_set_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"input_text" text NOT NULL,
	"expected_label" text NOT NULL,
	"category" text,
	CONSTRAINT "test_cases_input_text_check" CHECK (length("test_cases"."input_text") between 1 and 2000),
	CONSTRAINT "test_cases_expected_label_check" CHECK ("test_cases"."expected_label" in ('pembayaran', 'akses_akun', 'cara_pakai', 'bug', 'saran_fitur', 'answered', 'masked', 'blocked', 'escalated', 'clarify')),
	CONSTRAINT "test_cases_category_check" CHECK ("test_cases"."category" is null or "test_cases"."category" in ('pembayaran', 'akses_akun', 'cara_pakai', 'bug', 'saran_fitur'))
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_run_id" uuid NOT NULL,
	"test_case_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"verdict" text NOT NULL,
	"decision" text,
	"issue_type" text,
	"latency_ms" integer NOT NULL,
	"cost_usd" numeric(12, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_results_mode_check" CHECK ("test_results"."mode" in ('with_jev', 'without_jev')),
	CONSTRAINT "test_results_verdict_check" CHECK ("test_results"."verdict" in ('correct', 'wrong', 'escalated')),
	CONSTRAINT "test_results_decision_check" CHECK ("test_results"."decision" is null or "test_results"."decision" in ('answered', 'masked', 'blocked', 'escalated', 'clarify')),
	CONSTRAINT "test_results_issue_type_check" CHECK ("test_results"."issue_type" is null or "test_results"."issue_type" in ('pembayaran', 'akses_akun', 'cara_pakai', 'bug', 'saran_fitur')),
	CONSTRAINT "test_results_metrics_check" CHECK ("test_results"."latency_ms" >= 0 and "test_results"."cost_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "test_runs_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"test_set_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "test_runs_status_check" CHECK ("test_runs"."status" in ('running', 'done', 'failed', 'cancelled')),
	CONSTRAINT "test_runs_progress_check" CHECK ("test_runs"."progress" between 0 and "test_runs"."total" and "test_runs"."total" between 1 and 100),
	CONSTRAINT "test_runs_finished_at_check" CHECK (("test_runs"."status" = 'running') = ("test_runs"."finished_at" is null))
);
--> statement-breakpoint
CREATE TABLE "test_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_sets_name_check" CHECK (length(trim("test_sets"."name")) between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_test_set_id_test_sets_id_fk" FOREIGN KEY ("test_set_id") REFERENCES "public"."test_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_test_set_id_test_sets_id_fk" FOREIGN KEY ("test_set_id") REFERENCES "public"."test_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sets" ADD CONSTRAINT "test_sets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "test_cases_set_position_idx" ON "test_cases" USING btree ("test_set_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "test_results_run_case_mode_idx" ON "test_results" USING btree ("test_run_id","test_case_id","mode");--> statement-breakpoint
CREATE INDEX "test_results_case_idx" ON "test_results" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "test_runs_user_started_idx" ON "test_runs" USING btree ("user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "test_runs_set_idx" ON "test_runs" USING btree ("test_set_id");--> statement-breakpoint
CREATE INDEX "test_sets_user_created_idx" ON "test_sets" USING btree ("user_id","created_at");