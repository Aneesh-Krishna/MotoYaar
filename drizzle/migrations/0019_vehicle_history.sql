ALTER TABLE "expenses" ADD COLUMN "deleted_at" TIMESTAMPTZ;
ALTER TABLE "expenses" ADD COLUMN "deleted_by_owner" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users" ADD COLUMN "history_opt_out" BOOLEAN NOT NULL DEFAULT false;
