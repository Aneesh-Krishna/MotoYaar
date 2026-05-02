import { db } from "@/lib/db/client";
import { trips, vehicles, expenses } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { Trip, TripBreakdownItem } from "@/types";
import type { CreateTripInput, UpdateTripInput } from "@/lib/validations/trip";
import { vehicleService } from "@/services/vehicleService";
import { logger } from "@/lib/logger";

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
    const tripRows = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, userId))
      .orderBy(desc(trips.startDate));

    if (tripRows.length === 0) return [];

    const vehicleIds = [...new Set(tripRows.filter((r) => r.vehicleId).map((r) => r.vehicleId!))];
    const vehicleMap = new Map<string, { id: string; name: string; registrationNumber: string }>();

    if (vehicleIds.length > 0) {
      const vehicleRows = await db
        .select({ id: vehicles.id, name: vehicles.name, registrationNumber: vehicles.registrationNumber })
        .from(vehicles)
        .where(inArray(vehicles.id, vehicleIds));
      for (const v of vehicleRows) {
        vehicleMap.set(v.id, v);
      }
    }

    return tripRows.map((row) => mapTrip(row, vehicleMap.get(row.vehicleId ?? "") ?? null));
  },

  async getById(tripId: string, userId: string): Promise<Trip> {
    const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    if (!trip) throw new NotFoundError("Trip not found");
    if (trip.userId !== userId) throw new ForbiddenError("You do not have access to this trip");

    let vehicle: { id: string; name: string; registrationNumber: string } | null = null;
    if (trip.vehicleId) {
      vehicle =
        (await db.query.vehicles.findFirst({
          where: eq(vehicles.id, trip.vehicleId),
          columns: { id: true, name: true, registrationNumber: true },
        })) ?? null;
    }

    return mapTrip(trip, vehicle);
  },

  async create(userId: string, data: CreateTripInput): Promise<Trip> {
    if (data.vehicleId) {
      await vehicleService.getWithAccessCheck(data.vehicleId, userId);
    }

    const trip = await db.transaction(async (tx) => {
      const [tripRow] = await tx
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

      const totalCost = computeTotalCost(data.breakdown ?? []);
      if (totalCost > 0 && (data.vehicleId || data.createGeneralExpense)) {
        await tx.insert(expenses).values({
          userId,
          vehicleId: data.vehicleId ?? null,
          tripId: tripRow.id,
          price: String(totalCost),
          currency: "INR",
          date: data.startDate,
          reason: "Trip",
          whereText: data.title,
        });
      }

      return tripRow;
    });

    return mapTrip(trip);
  },

  async update(tripId: string, userId: string, data: UpdateTripInput): Promise<Trip> {
    const existing = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    if (!existing) throw new NotFoundError("Trip not found");
    if (existing.userId !== userId) throw new ForbiddenError("You do not own this trip");

    const existingExpense = await db.query.expenses.findFirst({
      where: and(eq(expenses.tripId, tripId), eq(expenses.userId, userId)),
    });

    const updatedTrip = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(trips)
        .set({
          vehicleId: "vehicleId" in data ? (data.vehicleId ?? null) : undefined,
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

      const vehicleChanged = "vehicleId" in data;
      const breakdownChanged = data.breakdown !== undefined;

      if (existingExpense && (vehicleChanged || breakdownChanged)) {
        const newBreakdown = mapBreakdown(updated.breakdown);
        const newTotalCost = computeTotalCost(newBreakdown);
        const expenseUpdate: { vehicleId?: string | null; price?: string } = {};
        if (vehicleChanged) expenseUpdate.vehicleId = data.vehicleId ?? null;
        if (breakdownChanged) expenseUpdate.price = String(newTotalCost);

        await tx
          .update(expenses)
          .set(expenseUpdate)
          .where(eq(expenses.id, existingExpense.id));
      }

      return updated;
    });

    return mapTrip(updatedTrip, null);
  },

  async delete(tripId: string, userId: string): Promise<void> {
    const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    if (!trip) throw new NotFoundError("Trip not found");
    if (trip.userId !== userId) throw new ForbiddenError("You do not own this trip");

    const tripExpenses = await db.query.expenses.findMany({
      where: eq(expenses.tripId, tripId),
    });

    await db.transaction(async (tx) => {
      if (tripExpenses.length > 0) {
        await tx.delete(expenses).where(eq(expenses.tripId, tripId));
        logger.info({ tripId, count: tripExpenses.length }, "Cascade-deleted trip expenses");
      }
      await tx.delete(trips).where(eq(trips.id, tripId));
    });
  },
};
