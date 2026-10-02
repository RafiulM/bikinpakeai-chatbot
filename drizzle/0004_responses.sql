CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"content" text NOT NULL,
	"latency_ms" integer NOT NULL,
	"cost_usd" numeric(12, 6) DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"model_id" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"verdict" text NOT NULL,
	"verdict_label" text NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highlight" text,
	"highlight_tone" text,
	"takeaway" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "responses_mode_check" CHECK ("responses"."mode" in ('with_jev', 'without_jev')),
	CONSTRAINT "responses_verdict_check" CHECK ("responses"."verdict" in ('correct', 'wrong', 'escalated')),
	CONSTRAINT "responses_highlight_tone_check" CHECK ("responses"."highlight_tone" is null or "responses"."highlight_tone" in ('good', 'bad')),
	CONSTRAINT "responses_metrics_check" CHECK ("responses"."latency_ms" >= 0 and "responses"."cost_usd" >= 0 and "responses"."input_tokens" >= 0 and "responses"."output_tokens" >= 0)
);
--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "responses_message_mode_idx" ON "responses" USING btree ("message_id","mode");--> statement-breakpoint
CREATE INDEX "responses_message_idx" ON "responses" USING btree ("message_id");