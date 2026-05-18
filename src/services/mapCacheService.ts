import { db } from "@/lib/db/client";
import { mapCache } from "@/lib/db/schema";
import { eq, lt, sql } from "drizzle-orm";
import crypto from "crypto";

export function buildCacheKey(parts: Record<string, string>): string {
  const normalized = JSON.stringify(parts, Object.keys(parts).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

const TTL_MS = {
  directions_traffic: 30 * 60 * 1000,
  directions_static: 24 * 60 * 60 * 1000,
  geocode: 7 * 24 * 60 * 60 * 1000,
  autocomplete: 24 * 60 * 60 * 1000,
} as const;

export type CacheType = "directions" | "geocode" | "autocomplete";

export async function getCached(cacheKey: string): Promise<unknown | null> {
  const rows = await db
    .select()
    .from(mapCache)
    .where(eq(mapCache.cacheKey, cacheKey))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (new Date(row.expiresAt) < new Date()) {
    await db.delete(mapCache).where(eq(mapCache.cacheKey, cacheKey));
    return null;
  }

  await db
    .update(mapCache)
    .set({ hitCount: sql`${mapCache.hitCount} + 1` })
    .where(eq(mapCache.cacheKey, cacheKey));

  return row.responseData;
}

export async function setCached(
  cacheKey: string,
  cacheType: CacheType,
  data: unknown,
  ttlKey: keyof typeof TTL_MS = "directions_traffic"
): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS[ttlKey]);

  await db
    .insert(mapCache)
    .values({
      cacheKey,
      cacheType,
      responseData: data as Record<string, unknown>,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: mapCache.cacheKey,
      set: {
        responseData: data as Record<string, unknown>,
        expiresAt,
        hitCount: 0,
        createdAt: new Date(),
      },
    });
}

export async function purgeExpired(): Promise<number> {
  const deleted = await db
    .delete(mapCache)
    .where(lt(mapCache.expiresAt, new Date()))
    .returning();
  return deleted.length;
}
