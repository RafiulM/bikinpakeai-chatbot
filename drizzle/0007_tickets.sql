CREATE TABLE "ticket_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"agent_name" varchar(80) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_replies_content_check" CHECK (length("ticket_replies"."content") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "tickets_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 201 CACHE 1),
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"claimed_by" varchar(80),
	"product" text NOT NULL,
	"issue_label" text NOT NULL,
	"frustration_score" numeric(4, 3) DEFAULT 0 NOT NULL,
	"churn_risk" numeric(4, 3) DEFAULT 0 NOT NULL,
	"summary" text NOT NULL,
	"summary_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_step" text NOT NULL,
	"escalation_reason" text NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_priority_check" CHECK ("tickets"."priority" in ('urgent', 'high', 'medium', 'low')),
	CONSTRAINT "tickets_status_check" CHECK ("tickets"."status" in ('open', 'claimed', 'closed')),
	CONSTRAINT "tickets_scores_check" CHECK ("tickets"."frustration_score" between 0 and 1 and "tickets"."churn_risk" between 0 and 1),
	CONSTRAINT "tickets_closed_at_check" CHECK (("tickets"."status" = 'closed') = ("tickets"."closed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_replies_ticket_created_idx" ON "ticket_replies" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_message_idx" ON "tickets" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "tickets_conversation_idx" ON "tickets" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "tickets_status_created_idx" ON "tickets" USING btree ("status","created_at");