-- Add score column to comments and create comment_votes table
ALTER TABLE "comments" ADD COLUMN "score" integer NOT NULL DEFAULT 0;

CREATE TABLE "comment_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "comment_id" uuid NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_comment_votes_comment_id" ON "comment_votes" ("comment_id");
CREATE UNIQUE INDEX "comment_votes_comment_id_user_id_unique" ON "comment_votes" ("comment_id", "user_id");
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_type_check" CHECK ("type" IN ('up', 'down'));
