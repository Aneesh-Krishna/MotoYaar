import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

if (!url.includes("localhost") && process.env.CONFIRM !== "yes") {
  throw new Error(
    "Refusing to reset non-localhost DB without CONFIRM=yes. URL: " + url
  );
}

const sql = postgres(url, { max: 1 });

async function main() {
  console.log("Resetting schema 'public'...");
  await sql.unsafe(
    `DROP SCHEMA IF EXISTS public CASCADE;
     DROP SCHEMA IF EXISTS drizzle CASCADE;
     CREATE SCHEMA public;`
  );
  console.log("Done. Now run: pnpm db:migrate");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
