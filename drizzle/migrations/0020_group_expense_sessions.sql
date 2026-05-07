CREATE TABLE "group_expense_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT,
  "trip_id" UUID REFERENCES "trips"("id") ON DELETE SET NULL,
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'active',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "invite_code" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "group_expense_sessions_status_check" CHECK ("status" IN ('active', 'archived'))
);

CREATE TABLE "group_expense_session_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL REFERENCES "group_expense_sessions"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("session_id", "user_id")
);

CREATE INDEX "idx_ges_created_by" ON "group_expense_sessions"("created_by");
CREATE INDEX "idx_ges_invite_code" ON "group_expense_sessions"("invite_code");
CREATE INDEX "idx_gesm_session_id" ON "group_expense_session_members"("session_id");
CREATE UNIQUE INDEX "gesm_session_id_user_id_unique" ON "group_expense_session_members"("session_id", "user_id");
