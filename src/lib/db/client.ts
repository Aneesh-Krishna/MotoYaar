import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// prepare: false required for pgBouncer compatibility
const client = postgres(connectionString, { prepare: false });

// Singleton guard — prevents connection pool exhaustion on Next.js hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export const db = globalThis.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalThis.db = db;
}
