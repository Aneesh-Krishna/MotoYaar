CREATE TABLE IF NOT EXISTS "vehicle_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"invitee_email" text NOT NULL,
	"invitee_user_id" uuid,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_invites_token_unique" UNIQUE("token"),
	CONSTRAINT "vehicle_invites_status_check" CHECK ("vehicle_invites"."status" IN ('pending', 'accepted', 'expired', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicle_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"access_level" text DEFAULT 'view' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_access_access_level_check" CHECK ("vehicle_access"."access_level" IN ('view'))
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vehicle_invites" ADD CONSTRAINT "vehicle_invites_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vehicle_invites" ADD CONSTRAINT "vehicle_invites_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vehicle_invites" ADD CONSTRAINT "vehicle_invites_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vehicle_access" ADD CONSTRAINT "vehicle_access_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vehicle_access" ADD CONSTRAINT "vehicle_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicle_invites_vehicle_id" ON "vehicle_invites" USING btree ("vehicle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicle_invites_token" ON "vehicle_invites" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicle_invites_invitee_email" ON "vehicle_invites" USING btree ("invitee_email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicle_access_vehicle_id" ON "vehicle_access" USING btree ("vehicle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicle_access_user_id" ON "vehicle_access" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_access_vehicle_id_user_id_unique" ON "vehicle_access" USING btree ("vehicle_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_vehicle_invites_pending" ON "vehicle_invites" USING btree ("vehicle_id","invitee_email") WHERE "vehicle_invites"."status" = 'pending';
