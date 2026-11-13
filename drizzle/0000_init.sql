CREATE TABLE "login_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client_key" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "received_webhooks" (
	"webhook_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone,
	"signed_at" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "login_attempts_client_key_attempted_at_idx" ON "login_attempts" USING btree ("client_key","attempted_at");--> statement-breakpoint
CREATE INDEX "received_webhooks_received_at_idx" ON "received_webhooks" USING btree ("received_at" DESC NULLS LAST);