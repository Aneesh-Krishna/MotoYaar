import { db } from "@/lib/db/client";
import { expenses, vehicles, users, serviceCenters } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export interface VehicleHistoryEntry {
  id: string;
  reason: string;
  date: string;
  serviceCenterName: string | null;
  odometerKm: number | null;
  deletedByOwner: boolean;
}

function normaliseReg(reg: string): string {
  return reg.replace(/[\s-]/g, "").toUpperCase();
}

export const vehicleHistoryService = {
  async getByReg(reg: string): Promise<VehicleHistoryEntry[]> {
    const normalisedReg = normaliseReg(reg);

    const rows = await db
      .select({
        id: expenses.id,
        reason: expenses.reason,
        date: expenses.date,
        serviceCenterName: serviceCenters.name,
        odometerKm: expenses.odometerKm,
        deletedByOwner: expenses.deletedByOwner,
      })
      .from(expenses)
      .innerJoin(vehicles, eq(expenses.vehicleId, vehicles.id))
      .innerJoin(users, eq(vehicles.userId, users.id))
      .leftJoin(serviceCenters, eq(expenses.serviceCenterId, serviceCenters.id))
      // Intentionally includes soft-deleted (deletedByOwner=true) rows as tombstones per AC6.
      // Do NOT add isNull(deletedAt) here — tombstone entries must remain visible in history.
      .where(
        and(
          eq(vehicles.registrationNumber, normalisedReg),
          eq(expenses.reason, "Service"),
          eq(users.historyOptOut, false)
        )
      )
      .orderBy(asc(expenses.date));

    return rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      date: r.date,
      serviceCenterName: r.serviceCenterName ?? null,
      odometerKm: r.odometerKm ?? null,
      deletedByOwner: r.deletedByOwner,
    }));
  },
};
