CREATE TABLE "answer_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"model_id" text,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"error" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_failures_mode_check" CHECK ("answer_failures"."mode" in ('with_jev', 'without_jev')),
	CONSTRAINT "answer_failures_latency_check" CHECK ("answer_failures"."latency_ms" >= 0)
);
--> statement-breakpoint
ALTER TABLE "answer_failures" ADD CONSTRAINT "answer_failures_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "answer_failures_message_mode_idx" ON "answer_failures" USING btree ("message_id","mode");