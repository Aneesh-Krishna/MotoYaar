CREATE TABLE "api_rate_limits" (
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"window_key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fuel_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" text NOT NULL,
	"name" text NOT NULL,
	"formatted_address" text,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "fuel_station_id" uuid;--> statement-breakpoint
ALTER TABLE "service_centers" ADD COLUMN "google_place_id" text;--> statement-breakpoint
ALTER TABLE "service_centers" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "service_centers" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "service_centers" ADD COLUMN "formatted_address" text;--> statement-breakpoint
CREATE UNIQUE INDEX "api_rate_limits_pk" ON "api_rate_limits" USING btree ("user_id","endpoint","window_key");--> statement-breakpoint
CREATE INDEX "idx_api_rate_limits_expires" ON "api_rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fuel_stations_google_place_id_unique" ON "fuel_stations" USING btree ("google_place_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fuel_station_id_fuel_stations_id_fk" FOREIGN KEY ("fuel_station_id") REFERENCES "public"."fuel_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_centers_google_place_id_unique" ON "service_centers" USING btree ("google_place_id") WHERE "service_centers"."google_place_id" IS NOT NULL;