import { db } from "@/lib/db/client";
import { serviceCenters, fuelStations } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { ServiceCenter } from "@/types";

async function findServiceCenterByPlaceId(placeId: string) {
  const rows = await db
    .select()
    .from(serviceCenters)
    .where(eq(serviceCenters.googlePlaceId, placeId))
    .limit(1);
  return rows[0];
}

async function findFuelStationByPlaceId(placeId: string) {
  const rows = await db
    .select()
    .from(fuelStations)
    .where(eq(fuelStations.googlePlaceId, placeId))
    .limit(1);
  return rows[0];
}

export interface FuelStation {
  id: string;
  googlePlaceId: string;
  name: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress?: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

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

function mapFuelStation(row: typeof fuelStations.$inferSelect): FuelStation {
  return {
    id: row.id,
    googlePlaceId: row.googlePlaceId,
    name: row.name,
    formattedAddress: row.formattedAddress ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export const placeUpsertService = {
  /**
   * Upserts a service_center row keyed by google_place_id. If a row already
   * exists for this place, returns it as-is (preserving reviews/ratings).
   * If a legacy row exists with no google_place_id, a new row is created
   * rather than mutated — we don't try to back-link old free-text rows.
   */
  async upsertServiceCenter(
    details: PlaceDetails,
    userId: string
  ): Promise<ServiceCenter> {
    const existing = await findServiceCenterByPlaceId(details.placeId);
    if (existing) return mapServiceCenter(existing);

    const [row] = await db
      .insert(serviceCenters)
      .values({
        name: details.name,
        city: details.city ?? "Unknown",
        pincode: details.pincode ?? null,
        createdBy: userId,
        googlePlaceId: details.placeId,
        lat: details.lat ?? null,
        lng: details.lng ?? null,
        formattedAddress: details.formattedAddress ?? null,
      })
      .onConflictDoUpdate({
        target: serviceCenters.googlePlaceId,
        // No-op on conflict — concurrent inserts collapse to a single row. We
        // must SET something or onConflictDoUpdate is invalid; set name to itself.
        set: { name: sql`${serviceCenters.name}` },
      })
      .returning();

    return mapServiceCenter(row);
  },

  async upsertFuelStation(details: PlaceDetails): Promise<FuelStation> {
    const existing = await findFuelStationByPlaceId(details.placeId);
    if (existing) return mapFuelStation(existing);

    const [row] = await db
      .insert(fuelStations)
      .values({
        googlePlaceId: details.placeId,
        name: details.name,
        formattedAddress: details.formattedAddress ?? null,
        lat: details.lat ?? null,
        lng: details.lng ?? null,
      })
      .onConflictDoUpdate({
        target: fuelStations.googlePlaceId,
        set: { name: sql`${fuelStations.name}` },
      })
      .returning();

    return mapFuelStation(row);
  },
};
