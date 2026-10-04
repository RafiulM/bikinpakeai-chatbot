CREATE TABLE "account_display_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"demo_mode" boolean DEFAULT true NOT NULL,
	"chatbot" text DEFAULT 'with_jev' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_display_settings_chatbot_check" CHECK ("account_display_settings"."chatbot" in ('with_jev', 'without_jev'))
);
--> statement-breakpoint
ALTER TABLE "account_display_settings" ADD CONSTRAINT "account_display_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;