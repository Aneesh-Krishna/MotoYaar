CREATE TABLE "group_expense_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL REFERENCES "group_expense_sessions"("id") ON DELETE CASCADE,
  "logged_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "paid_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" NUMERIC(12,2) NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "included_user_ids" TEXT[] NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "group_expense_items_category_check" CHECK ("category" IN ('Food', 'Fuel', 'Stay', 'Toll', 'Misc'))
);

CREATE INDEX "idx_gei_session_id" ON "group_expense_items"("session_id");
