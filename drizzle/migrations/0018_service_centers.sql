CREATE TABLE IF NOT EXISTS "service_centers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "pincode" text,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "avg_rating" numeric(3, 2),
  "review_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_service_centers_city" ON "service_centers" ("city");
CREATE INDEX IF NOT EXISTS "idx_service_centers_name" ON "service_centers" USING GIN (to_tsvector('english', "name"));

CREATE TABLE IF NOT EXISTS "service_center_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_center_id" uuid NOT NULL REFERENCES "service_centers"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "review_text" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "service_center_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "service_center_reviews_review_text_check" CHECK ("review_text" IS NULL OR char_length("review_text") <= 100),
  CONSTRAINT "service_center_reviews_sc_id_user_id_unique" UNIQUE ("service_center_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_service_center_reviews_sc_id" ON "service_center_reviews" ("service_center_id");

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "service_center_id" uuid REFERENCES "service_centers"("id") ON DELETE SET NULL;
