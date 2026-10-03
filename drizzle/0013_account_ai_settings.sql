CREATE TABLE "account_ai_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"openrouter_key_encrypted" text NOT NULL,
	"openrouter_key_hint" varchar(16) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_ai_settings" ADD CONSTRAINT "account_ai_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;