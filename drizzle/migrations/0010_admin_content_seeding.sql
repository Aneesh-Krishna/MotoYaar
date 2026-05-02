ALTER TABLE "users" ALTER COLUMN "google_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_verified" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "pinned_at" timestamp with time zone;
