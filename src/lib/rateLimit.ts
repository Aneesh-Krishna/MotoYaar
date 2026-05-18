import { db } from "@/lib/db/client";
import { apiRateLimits } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { QuotaExceededError } from "@/lib/errors";

// All-zeros UUID reserved for global counters (no real user has this id).
const GLOBAL_USER_ID = "00000000-0000-0000-0000-000000000000";

export interface RateLimitRule {
  endpoint: string;
  perUserPerMin?: number;
  perUserPerDay?: number;
  globalPerDay?: number;
}

function minuteKey(d: Date): string {
  // YYYY-MM-DDTHH:MM (UTC) — fine-grained per-minute bucket
  return `min:${d.toISOString().slice(0, 16)}`;
}

function dayKey(d: Date): string {
  return `day:${d.toISOString().slice(0, 10)}`;
}

async function incrementAndCheck(
  userId: string,
  endpoint: string,
  windowKey: string,
  limit: number,
  expiresAt: Date
): Promise<number> {
  // Atomic insert-or-increment. Returns the new count.
  const rows = await db
    .insert(apiRateLimits)
    .values({ userId, endpoint, windowKey, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: [apiRateLimits.userId, apiRateLimits.endpoint, apiRateLimits.windowKey],
      set: { count: sql`${apiRateLimits.count} + 1` },
    })
    .returning({ count: apiRateLimits.count });

  const count = rows[0]?.count ?? 1;
  if (count > limit) {
    throw new QuotaExceededError(
      `Rate limit exceeded for ${endpoint}. Try again shortly.`
    );
  }
  return count;
}

/**
 * Enforces rate limits BEFORE a billable upstream call. Throws QuotaExceededError
 * when any limit is exceeded. All limits in the rule are checked atomically; the
 * first violation aborts subsequent checks (already-incremented counters stay —
 * they expire naturally and the user is over budget anyway).
 */
export async function enforceRateLimit(userId: string, rule: RateLimitRule): Promise<void> {
  const now = new Date();
  // Window expires at (window_end + small slack) so the row eventually self-cleans.
  const minuteExpiry = new Date(now.getTime() + 2 * 60 * 1000);
  const dayExpiry = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  if (rule.perUserPerMin != null) {
    await incrementAndCheck(userId, rule.endpoint, minuteKey(now), rule.perUserPerMin, minuteExpiry);
  }
  if (rule.perUserPerDay != null) {
    await incrementAndCheck(userId, rule.endpoint, dayKey(now), rule.perUserPerDay, dayExpiry);
  }
  if (rule.globalPerDay != null) {
    await incrementAndCheck(GLOBAL_USER_ID, rule.endpoint, dayKey(now), rule.globalPerDay, dayExpiry);
  }
}

/** Deletes expired rate-limit rows. Call from a cron job; safe to skip — rows are tiny. */
export async function purgeExpiredRateLimits(): Promise<number> {
  const rows = await db
    .delete(apiRateLimits)
    .where(sql`${apiRateLimits.expiresAt} < now()`)
    .returning();
  return rows.length;
}

export const RATE_LIMITS = {
  placesAutocomplete: {
    endpoint: "places.autocomplete",
    perUserPerMin: 60,
    perUserPerDay: 500,
  },
  placesDetails: {
    endpoint: "places.details",
    perUserPerMin: 30,
    perUserPerDay: 200,
    globalPerDay: 5000,
  },
} as const satisfies Record<string, RateLimitRule>;

// Exposed for tests
export const __test__ = { minuteKey, dayKey, GLOBAL_USER_ID, incrementAndCheck };
