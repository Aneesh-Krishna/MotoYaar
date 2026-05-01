import { db } from "@/lib/db/client";
import { trips, vehicles, expenses } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { Trip, TripBreakdownItem } from "@/types";
import type { CreateTripInput, UpdateTripInput } from "@/lib/validations/trip";

function computeTotalCost(breakdown: TripBreakdownItem[]): number {
  return breakdown.reduce((sum, item) => sum + item.amount, 0);
}

function mapBreakdown(raw: unknown): TripBreakdownItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is TripBreakdownItem =>
      typeof item === "object" && item !== null && "category" in item && "amount" in item
  );
}

function mapTrip(
  row: typeof trips.$inferSelect,
  vehicle?: Pick<typeof vehicles.$inferSelect, "id" | "name" | "registrationNumber"> | null
): Trip {
  const breakdown = mapBreakdown(row.breakdown);
  return {
    id: row.id,
    userId: row.userId,
    vehicleId: row.vehicleId ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    startDate: row.startDate,
    endDate: row.endDate ?? undefined,
    routeText: row.routeText ?? undefined,
    mapsLink: row.mapsLink ?? undefined,
    timeTaken: row.timeTaken ?? undefined,
    breakdown,
    totalCost: computeTotalCost(breakdown),
    hasLiveRoute: row.hasLiveRoute,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    vehicle: vehicle
      ? { id: vehicle.id, name: vehicle.name, registrationNumber: vehicle.registrationNumber }
      : undefined,
  };
}

export const tripService = {
  async listByUser(userId: string): Promise<Trip[]> {
    const rows = await db
      .select({
        trip: trips,
        vehicle: {
          id: vehicles.id,
          name: vehicles.name,
          registrationNumber: vehicles.registrationNumber,
        },
      })
      .from(trips)
      .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(eq(trips.userId, userId))
      .orderBy(desc(trips.startDate));

    return rows.map(({ trip, vehicle }) => mapTrip(trip, vehicle));
  },

  async getById(tripId: string, userId: string): Promise<Trip> {
    const [row] = await db
      .select({
        trip: trips,
        vehicle: {
          id: vehicles.id,
          name: vehicles.name,
          registrationNumber: vehicles.registrationNumber,
        },
      })
      .from(trips)
      .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(eq(trips.id, tripId))
      .limit(1);

    if (!row) throw new NotFoundError("Trip not found");
    if (row.trip.userId !== userId) throw new ForbiddenError("You do not have access to this trip");

    return mapTrip(row.trip, row.vehicle);
  },

  async create(userId: string, data: CreateTripInput): Promise<Trip> {
    const [trip] = await db
      .insert(trips)
      .values({
        userId,
        vehicleId: data.vehicleId ?? null,
        title: data.title,
        description: data.description ?? null,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        routeText: data.routeText ?? null,
        mapsLink: data.mapsLink || null,
        timeTaken: data.timeTaken ?? null,
        breakdown: data.breakdown,
      })
      .returning();

    if (data.createGeneralExpense && data.breakdown.length > 0) {
      const totalCost = computeTotalCost(data.breakdown);
      if (totalCost > 0) {
        await db.insert(expenses).values({
          userId,
          vehicleId: data.vehicleId ?? null,
          tripId: trip.id,
          price: String(totalCost),
          currency: "INR",
          date: data.startDate,
          reason: "Trip",
        });
      }
    }

    return mapTrip(trip);
  },

  async update(tripId: string, userId: string, data: UpdateTripInput): Promise<Trip> {
    const existing = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    if (!existing) throw new NotFoundError("Trip not found");
    if (existing.userId !== userId) throw new ForbiddenError("You do not own this trip");

    const [updated] = await db
      .update(trips)
      .set({
        vehicleId: data.vehicleId === null ? null : (data.vehicleId ?? undefined),
        title: data.title,
        description: data.description ?? null,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        routeText: data.routeText ?? null,
        mapsLink: data.mapsLink || null,
        timeTaken: data.timeTaken ?? null,
        breakdown: data.breakdown,
      })
      .where(eq(trips.id, tripId))
      .returning();

    let vehicle: { id: string; name: string; registrationNumber: string } | null = null;
    if (updated.vehicleId) {
      vehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, updated.vehicleId),
        columns: { id: true, name: true, registrationNumber: true },
      }) ?? null;
    }

    return mapTrip(updated, vehicle);
  },

  async delete(tripId: string, userId: string): Promise<void> {
    const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    if (!trip) throw new NotFoundError("Trip not found");
    if (trip.userId !== userId) throw new ForbiddenError("You do not own this trip");

    await db.delete(trips).where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
  },
};
