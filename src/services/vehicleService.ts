import { db } from "@/lib/db/client";
import { vehicles, expenses, documents, vehicleAccess } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { getDocumentStatus } from "@/lib/utils";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { storageService } from "@/services/storageService";
import { notificationService } from "@/services/notificationService";
import { logger } from "@/lib/logger";
import type { Vehicle, DocumentStatus } from "@/types";
import type { CreateVehicleInput, UpdateVehicleInput } from "@/lib/validations/vehicle";

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

  async getWithAccessCheck(vehicleId: string, userId: string): Promise<Vehicle> {
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(vehicles.id, vehicleId),
    });

    if (!vehicle) throw new NotFoundError("Vehicle not found");

    if (vehicle.userId === userId) {
      return {
        id: vehicle.id,
        userId: vehicle.userId,
        name: vehicle.name,
        type: vehicle.type as Vehicle["type"],
        company: vehicle.company ?? undefined,
        model: vehicle.model ?? undefined,
        variant: vehicle.variant ?? undefined,
        color: vehicle.color ?? undefined,
        registrationNumber: vehicle.registrationNumber,
        purchasedAt: vehicle.purchasedAt ?? undefined,
        previousOwners: vehicle.previousOwners,
        imageUrl: vehicle.imageUrl ?? undefined,
        createdAt:
          vehicle.createdAt instanceof Date
            ? vehicle.createdAt.toISOString()
            : String(vehicle.createdAt),
      };
    }

    const access = await db.query.vehicleAccess.findFirst({
      where: and(
        eq(vehicleAccess.vehicleId, vehicleId),
        eq(vehicleAccess.userId, userId)
      ),
    });

    if (!access) throw new ForbiddenError("You do not have access to this vehicle");

    return {
      id: vehicle.id,
      userId: vehicle.userId,
      name: vehicle.name,
      type: vehicle.type as Vehicle["type"],
      company: vehicle.company ?? undefined,
      model: vehicle.model ?? undefined,
      variant: vehicle.variant ?? undefined,
      color: vehicle.color ?? undefined,
      registrationNumber: vehicle.registrationNumber,
      purchasedAt: vehicle.purchasedAt ?? undefined,
      previousOwners: vehicle.previousOwners,
      imageUrl: vehicle.imageUrl ?? undefined,
      createdAt:
        vehicle.createdAt instanceof Date
          ? vehicle.createdAt.toISOString()
          : String(vehicle.createdAt),
    };
  },

  async getTotalSpend(_vehicleId: string): Promise<number> {
    return 0;
  },

  async getByIdOwnerOnly(vehicleId: string, userId: string): Promise<Vehicle> {
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(vehicles.id, vehicleId),
    });

    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (vehicle.userId !== userId) throw new ForbiddenError("Only the vehicle owner can edit this vehicle");

    return {
      id: vehicle.id,
      userId: vehicle.userId,
      name: vehicle.name,
      type: vehicle.type as Vehicle["type"],
      company: vehicle.company ?? undefined,
      model: vehicle.model ?? undefined,
      variant: vehicle.variant ?? undefined,
      color: vehicle.color ?? undefined,
      registrationNumber: vehicle.registrationNumber,
      purchasedAt: vehicle.purchasedAt ?? undefined,
      previousOwners: vehicle.previousOwners,
      imageUrl: vehicle.imageUrl ?? undefined,
      createdAt:
        vehicle.createdAt instanceof Date
          ? vehicle.createdAt.toISOString()
          : String(vehicle.createdAt),
    };
  },

  async update(vehicleId: string, userId: string, data: UpdateVehicleInput): Promise<Vehicle> {
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(vehicles.id, vehicleId),
    });
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (vehicle.userId !== userId) throw new ForbiddenError("Only the vehicle owner can edit this vehicle");

    if (data.registrationNumber && data.registrationNumber.toUpperCase() !== vehicle.registrationNumber) {
      const duplicate = await db.query.vehicles.findFirst({
        where: and(
          eq(vehicles.userId, userId),
          eq(vehicles.registrationNumber, data.registrationNumber.toUpperCase())
        ),
      });
      if (duplicate) throw new ConflictError("You already have a vehicle with this registration number");
    }

    // imageKey is not stored in DB — strip it before update
    const { imageKey: _imageKey, ...updateData } = data;

    const [updated] = await db
      .update(vehicles)
      .set({
        ...updateData,
        registrationNumber: data.registrationNumber
          ? data.registrationNumber.toUpperCase()
          : undefined,
      })
      .where(eq(vehicles.id, vehicleId))
      .returning();

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      type: updated.type as Vehicle["type"],
      company: updated.company ?? undefined,
      model: updated.model ?? undefined,
      variant: updated.variant ?? undefined,
      color: updated.color ?? undefined,
      registrationNumber: updated.registrationNumber,
      purchasedAt: updated.purchasedAt ?? undefined,
      previousOwners: updated.previousOwners,
      imageUrl: updated.imageUrl ?? undefined,
      createdAt:
        updated.createdAt instanceof Date
          ? updated.createdAt.toISOString()
          : String(updated.createdAt),
    };
  },

  async delete(vehicleId: string, userId: string): Promise<void> {
    // 1. Ownership check
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(vehicles.id, vehicleId),
    });
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (vehicle.userId !== userId) throw new ForbiddenError("Only the vehicle owner can delete this vehicle");

    // 2. Get all documents with stored R2 files before deleting
    const storedDocs = await db.query.documents.findMany({
      where: and(
        eq(documents.vehicleId, vehicleId),
        isNotNull(documents.storageUrl)
      ),
    });

    // 3. Get all viewers (for notification)
    const viewers = await db.query.vehicleAccess.findMany({
      where: eq(vehicleAccess.vehicleId, vehicleId),
    });

    // 4. Delete vehicle — FK ON DELETE CASCADE handles child records
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));

    // 5. Delete R2 files (after DB delete — failures must not break the flow)
    if (vehicle.imageUrl) {
      await storageService.deleteFile(vehicle.imageUrl).catch((e) =>
        logger.error({ error: e, vehicleId }, "Failed to delete vehicle image from R2")
      );
    }
    for (const doc of storedDocs) {
      if (doc.storageUrl) {
        await storageService.deleteFile(doc.storageUrl).catch((e) =>
          logger.error({ error: e, docId: doc.id }, "Failed to delete document from R2")
        );
      }
    }

    // 6. Notify viewers
    for (const viewer of viewers) {
      await notificationService.create({
        userId: viewer.userId,
        type: "vehicle_removed",
        message: "A vehicle shared with you has been removed.",
      }).catch((e) =>
        logger.error({ error: e, viewerId: viewer.userId }, "Failed to send vehicle removal notification")
      );
    }
  },

  async create(userId: string, data: CreateVehicleInput): Promise<Vehicle> {
    const regNumber = data.registrationNumber.toUpperCase();

    // Duplicate registration number check
    const existing = await db.query.vehicles.findFirst({
      where: and(
        eq(vehicles.userId, userId),
        eq(vehicles.registrationNumber, regNumber)
      ),
    });
    if (existing) {
      throw new ConflictError("You already have a vehicle with this registration number");
    }

    // imageKey is not stored in DB — strip it before insert
    const { imageKey: _imageKey, ...insertData } = data;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        userId,
        ...insertData,
        registrationNumber: regNumber,
      })
      .returning();

    return {
      id: vehicle.id,
      userId: vehicle.userId,
      name: vehicle.name,
      type: vehicle.type as Vehicle["type"],
      company: vehicle.company ?? undefined,
      model: vehicle.model ?? undefined,
      variant: vehicle.variant ?? undefined,
      color: vehicle.color ?? undefined,
      registrationNumber: vehicle.registrationNumber,
      purchasedAt: vehicle.purchasedAt ?? undefined,
      previousOwners: vehicle.previousOwners,
      imageUrl: vehicle.imageUrl ?? undefined,
      createdAt:
        vehicle.createdAt instanceof Date
          ? vehicle.createdAt.toISOString()
          : String(vehicle.createdAt),
    };
  },
};
