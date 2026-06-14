ALTER TABLE "jobs" ADD COLUMN "delete_after" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "storage_quota" bigint;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "retention_hours" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_used" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_quota" bigint;