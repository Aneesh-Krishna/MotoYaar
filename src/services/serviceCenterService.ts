import { db } from "@/lib/db/client";
import { serviceCenters, serviceCenterReviews } from "@/lib/db/schema";
import { eq, ilike, and, avg, count, desc, or, sql } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import type { ServiceCenter, ServiceCenterReview } from "@/types";

function mapServiceCenter(row: typeof serviceCenters.$inferSelect): ServiceCenter {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    pincode: row.pincode ?? undefined,
    createdBy: row.createdBy ?? undefined,
    avgRating: row.avgRating != null ? Number(row.avgRating) : undefined,
    reviewCount: row.reviewCount,
    googlePlaceId: row.googlePlaceId ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    formattedAddress: row.formattedAddress ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapReview(row: typeof serviceCenterReviews.$inferSelect): ServiceCenterReview {
  return {
    id: row.id,
    serviceCenterId: row.serviceCenterId,
    userId: row.userId,
    rating: row.rating,
    reviewText: row.reviewText ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const serviceCenterService = {
  async search(q: string, city?: string): Promise<ServiceCenter[]> {
    const conditions = [];
    if (q) {
      conditions.push(
        or(ilike(serviceCenters.name, `%${q}%`), ilike(serviceCenters.city, `%${q}%`))
      );
    }
    if (city) {
      conditions.push(ilike(serviceCenters.city, `%${city}%`));
    }

    const rows = await db
      .select()
      .from(serviceCenters)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(10);

    return rows.map(mapServiceCenter);
  },

  async create(data: { name: string; city: string; pincode?: string }, userId: string): Promise<ServiceCenter> {
    const [row] = await db
      .insert(serviceCenters)
      .values({ name: data.name, city: data.city, pincode: data.pincode ?? null, createdBy: userId })
      .returning();
    return mapServiceCenter(row);
  },

  async getById(id: string): Promise<ServiceCenter> {
    const row = await db.query.serviceCenters.findFirst({ where: eq(serviceCenters.id, id) });
    if (!row) throw new NotFoundError("Service center not found");
    return mapServiceCenter(row);
  },

  async getReviews(serviceCenterId: string): Promise<ServiceCenterReview[]> {
    const rows = await db
      .select()
      .from(serviceCenterReviews)
      .where(eq(serviceCenterReviews.serviceCenterId, serviceCenterId))
      .orderBy(desc(serviceCenterReviews.createdAt))
      .limit(10);
    return rows.map(mapReview);
  },

  async upsertReview(
    serviceCenterId: string,
    userId: string,
    rating: number,
    reviewText?: string
  ): Promise<ServiceCenterReview> {
    const [row] = await db
      .insert(serviceCenterReviews)
      .values({ serviceCenterId, userId, rating, reviewText: reviewText ?? null })
      .onConflictDoUpdate({
        target: [serviceCenterReviews.serviceCenterId, serviceCenterReviews.userId],
        set: {
          rating,
          reviewText: reviewText ?? null,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    // Recalculate avg + count
    const [agg] = await db
      .select({ avg: avg(serviceCenterReviews.rating), count: count() })
      .from(serviceCenterReviews)
      .where(eq(serviceCenterReviews.serviceCenterId, serviceCenterId));

    await db
      .update(serviceCenters)
      .set({
        avgRating: agg.avg ?? null,
        reviewCount: agg.count,
      })
      .where(eq(serviceCenters.id, serviceCenterId));

    return mapReview(row);
  },
};
