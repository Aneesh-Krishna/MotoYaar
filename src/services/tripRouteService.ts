import { db } from "@/lib/db/client";
import { tripRoutes, trips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { haversineDistance, totalDistance } from "@/utils/geo";
import type { TripRoute, Waypoint } from "@/types";

export const tripRouteService = {
  async getByTripId(tripId: string, userId: string): Promise<TripRoute> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new NotFoundError("Trip not found");
    if (trip.userId !== userId) throw new ForbiddenError("Access denied");

    const [route] = await db.select().from(tripRoutes).where(eq(tripRoutes.tripId, tripId));
    if (!route) throw new NotFoundError("Route not found for this trip");
    return route as unknown as TripRoute;
  },

  async createOrAppend(tripId: string, userId: string, newWaypoints: Waypoint[]): Promise<TripRoute> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new NotFoundError("Trip not found");
    if (trip.userId !== userId) throw new ForbiddenError("Access denied");

    const [existing] = await db.select().from(tripRoutes).where(eq(tripRoutes.tripId, tripId));

    return db.transaction(async (tx) => {
      if (!existing) {
        const distanceKm = totalDistance(newWaypoints) / 1000;
        const [created] = await tx
          .insert(tripRoutes)
          .values({ tripId, waypoints: newWaypoints, distanceKm: distanceKm.toFixed(3) })
          .returning();
        await tx.update(trips).set({ hasLiveRoute: true }).where(eq(trips.id, tripId));
        return created as unknown as TripRoute;
      }

      const existingWaypoints = existing.waypoints as unknown as Waypoint[];
      const merged = mergeWaypoints(existingWaypoints, newWaypoints);
      const distanceKm = totalDistance(merged) / 1000;

      const [updated] = await tx
        .update(tripRoutes)
        .set({ waypoints: merged, distanceKm: distanceKm.toFixed(3), updatedAt: new Date() })
        .where(eq(tripRoutes.tripId, tripId))
        .returning();
      return updated as unknown as TripRoute;
    });
  },

  async deleteByTripId(tripId: string, userId: string): Promise<void> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new NotFoundError("Trip not found");
    if (trip.userId !== userId) throw new ForbiddenError("Access denied");

    await db.transaction(async (tx) => {
      await tx.delete(tripRoutes).where(eq(tripRoutes.tripId, tripId));
      await tx.update(trips).set({ hasLiveRoute: false }).where(eq(trips.id, tripId));
    });
  },
};

function mergeWaypoints(existing: Waypoint[], incoming: Waypoint[]): Waypoint[] {
  const merged = [...existing];
  for (const pt of incoming) {
    const isDupe = merged.some(
      (e) =>
        Math.abs(e.timestamp - pt.timestamp) < 1000 &&
        haversineDistance(e, pt) < 5
    );
    if (!isDupe) merged.push(pt);
  }
  return merged.sort((a, b) => a.timestamp - b.timestamp);
}
