CREATE TABLE "scenario_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" varchar(60) NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "scenario_categories_id_check" CHECK ("scenario_categories"."id" in ('pembayaran', 'akses_akun', 'cara_pakai', 'bug', 'saran_fitur'))
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"prompt" text NOT NULL,
	"expected_intent" varchar(80),
	"expected_route" varchar(80),
	"position" integer NOT NULL,
	CONSTRAINT "scenarios_id_check" CHECK ("scenarios"."id" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "scenarios_prompt_check" CHECK (length("scenarios"."prompt") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_category_id_scenario_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."scenario_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scenarios_category_position_idx" ON "scenarios" USING btree ("category_id","position");