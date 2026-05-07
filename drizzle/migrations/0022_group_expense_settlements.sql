CREATE TABLE IF NOT EXISTS "group_expense_settlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "group_expense_sessions"("id") ON DELETE CASCADE,
  "from_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "to_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "amount" numeric(12, 2) NOT NULL,
  "settled_at" timestamptz NOT NULL DEFAULT now(),
  "settled_by" uuid NOT NULL REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "idx_gest_session_id" ON "group_expense_settlements" ("session_id");
