-- Composite index for expense range report queries (listByUserAndRange filters on user_id + date)
CREATE INDEX IF NOT EXISTS "idx_expenses_user_id_date" ON "expenses" ("user_id", "date");
