DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
  END IF;
END $$;
