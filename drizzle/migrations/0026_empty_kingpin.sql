CREATE TABLE "club_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_members_role_check" CHECK ("club_members"."role" IN ('admin', 'member')),
	CONSTRAINT "club_members_status_check" CHECK ("club_members"."status" IN ('active', 'pending', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"description" text,
	"logo_url" text,
	"invite_code" text NOT NULL,
	"join_policy" text DEFAULT 'approval' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_name_unique" UNIQUE("name"),
	CONSTRAINT "clubs_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "clubs_join_policy_check" CHECK ("clubs"."join_policy" IN ('approval', 'open'))
);
--> statement-breakpoint
CREATE TABLE "comment_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_votes_type_check" CHECK ("comment_votes"."type" IN ('up', 'down'))
);
--> statement-breakpoint
CREATE TABLE "group_expense_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"logged_by" uuid NOT NULL,
	"paid_by" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"included_user_ids" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_expense_items_category_check" CHECK ("group_expense_items"."category" IN ('Food', 'Fuel', 'Stay', 'Toll', 'Misc'))
);
--> statement-breakpoint
CREATE TABLE "group_expense_session_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_expense_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"trip_id" uuid,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"invite_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_expense_sessions_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "group_expense_sessions_status_check" CHECK ("group_expense_sessions"."status" IN ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "group_expense_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_by" uuid NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "service_center_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_center_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_center_reviews_rating_check" CHECK ("service_center_reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "service_center_reviews_review_text_check" CHECK ("service_center_reviews"."review_text" IS NULL OR char_length("service_center_reviews"."review_text") <= 100)
);
--> statement-breakpoint
CREATE TABLE "service_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"pincode" text,
	"created_by" uuid,
	"avg_rating" numeric(3, 2),
	"review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"service_type" text NOT NULL,
	"km_interval" integer,
	"day_interval" integer,
	"last_serviced_km" integer,
	"last_serviced_at" date,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_reports" ADD COLUMN "expense_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "litres_filled" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "odometer_km" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "kmpl" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "service_center_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "deleted_by_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "club_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "history_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_items" ADD CONSTRAINT "group_expense_items_session_id_group_expense_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_expense_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_items" ADD CONSTRAINT "group_expense_items_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_items" ADD CONSTRAINT "group_expense_items_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_session_members" ADD CONSTRAINT "group_expense_session_members_session_id_group_expense_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_expense_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_session_members" ADD CONSTRAINT "group_expense_session_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_sessions" ADD CONSTRAINT "group_expense_sessions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_sessions" ADD CONSTRAINT "group_expense_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_settlements" ADD CONSTRAINT "group_expense_settlements_session_id_group_expense_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_expense_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_settlements" ADD CONSTRAINT "group_expense_settlements_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_settlements" ADD CONSTRAINT "group_expense_settlements_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_expense_settlements" ADD CONSTRAINT "group_expense_settlements_settled_by_users_id_fk" FOREIGN KEY ("settled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_center_reviews" ADD CONSTRAINT "service_center_reviews_service_center_id_service_centers_id_fk" FOREIGN KEY ("service_center_id") REFERENCES "public"."service_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_center_reviews" ADD CONSTRAINT "service_center_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_centers" ADD CONSTRAINT "service_centers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reminders" ADD CONSTRAINT "service_reminders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reminders" ADD CONSTRAINT "service_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_club_members_club_id" ON "club_members" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "idx_club_members_user_id" ON "club_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "club_members_club_id_user_id_unique" ON "club_members" USING btree ("club_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_clubs_city" ON "clubs" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_comment_votes_comment_id" ON "comment_votes" USING btree ("comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_votes_comment_id_user_id_unique" ON "comment_votes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_gei_session_id" ON "group_expense_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_gesm_session_id" ON "group_expense_session_members" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gesm_session_id_user_id_unique" ON "group_expense_session_members" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_ges_created_by" ON "group_expense_sessions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_ges_invite_code" ON "group_expense_sessions" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "idx_gest_session_id" ON "group_expense_settlements" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_map_cache_expires" ON "map_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_saved_places_user_id" ON "saved_places" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_center_reviews_sc_id_user_id_unique" ON "service_center_reviews" USING btree ("service_center_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_service_center_reviews_sc_id" ON "service_center_reviews" USING btree ("service_center_id");--> statement-breakpoint
CREATE INDEX "idx_service_centers_city" ON "service_centers" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_service_centers_name" ON "service_centers" USING gin (to_tsvector('english', "name"));--> statement-breakpoint
CREATE INDEX "idx_service_reminders_vehicle_id" ON "service_reminders" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_service_reminders_user_id" ON "service_reminders" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_service_center_id_service_centers_id_fk" FOREIGN KEY ("service_center_id") REFERENCES "public"."service_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expenses_user_id_date" ON "expenses" USING btree ("user_id","date");