import { db } from "@/lib/db/client";
import { vehicles, expenses, documents } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { getDocumentStatus } from "@/lib/utils";
import type { Vehicle, DocumentStatus } from "@/types";

export const vehicleService = {
  /**
   * Returns all vehicles for a user with three computed fields:
   *   - totalSpend: SUM of all expense prices (Drizzle returns numeric as string → parseFloat)
   *   - nextDocumentExpiry: earliest document expiry date across all vehicle's documents
   *   - nextDocumentStatus: derived from nextDocumentExpiry
   *
   * Uses separate aggregation queries per concern to avoid cross-product
   * when joining both expenses and documents simultaneously.
   */
  async listByUser(userId: string): Promise<Vehicle[]> {
    const [vehicleRows, spendRows, expiryRows] = await Promise.all([
      // 1. All vehicles for the user
      db.select().from(vehicles).where(eq(vehicles.userId, userId)),

      // 2. Total spend per vehicle (SUM — Drizzle returns numeric as string)
      db
        .select({
          vehicleId: expenses.vehicleId,
          total: sql<string>`COALESCE(SUM(${expenses.price}), '0')`,
        })
        .from(expenses)
        .where(eq(expenses.userId, userId))
        .groupBy(expenses.vehicleId),

      // 3. Nearest document expiry per vehicle
      db
        .select({
          vehicleId: documents.vehicleId,
          nextExpiry: sql<string | null>`MIN(${documents.expiryDate}::text)`,
        })
        .from(documents)
        .where(and(eq(documents.userId, userId), isNotNull(documents.expiryDate)))
        .groupBy(documents.vehicleId),
    ]);

    // Build lookup maps
    const spendMap = new Map<string, number>();
    for (const row of spendRows) {
      if (row.vehicleId) spendMap.set(row.vehicleId, parseFloat(row.total));
    }

    const expiryMap = new Map<string, string | null>();
    for (const row of expiryRows) {
      if (row.vehicleId) expiryMap.set(row.vehicleId, row.nextExpiry);
    }

    return vehicleRows.map((row) => {
      const nextDocumentExpiry = expiryMap.get(row.id) ?? undefined;
      const nextDocumentStatus: DocumentStatus | undefined = nextDocumentExpiry
        ? getDocumentStatus(nextDocumentExpiry)
        : undefined;

      return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        type: row.type as Vehicle["type"],
        company: row.company ?? undefined,
        model: row.model ?? undefined,
        variant: row.variant ?? undefined,
        color: row.color ?? undefined,
        registrationNumber: row.registrationNumber,
        purchasedAt: row.purchasedAt ?? undefined,
        previousOwners: row.previousOwners,
        imageUrl: row.imageUrl ?? undefined,
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt),
        totalSpend: spendMap.get(row.id),
        nextDocumentExpiry,
        nextDocumentStatus,
      };
    });
  },
};
