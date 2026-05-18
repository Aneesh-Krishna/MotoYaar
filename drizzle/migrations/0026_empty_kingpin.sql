-- Story 17.1 (maps): map response cache + user-saved places
-- Note: this migration was regenerated to drop duplicate CREATE TABLE statements
-- that were already created by earlier migrations (0017, 0018, 0020-0025).

CREATE TABLE "map_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"cache_type" text NOT NULL,
	"response_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "map_cache_type_check" CHECK ("map_cache"."cache_type" IN ('autocomplete', 'directions', 'geocode'))
);
--> statement-breakpoint
CREATE TABLE "saved_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"place_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_map_cache_expires" ON "map_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_saved_places_user_id" ON "saved_places" USING btree ("user_id");
