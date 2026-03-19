import { db } from "@/lib/db/client";
import { documents, users, vehicles } from "@/lib/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { storageService } from "@/services/storageService";
import { vehicleService } from "@/services/vehicleService";
import { logger } from "@/lib/logger";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Document, DocumentStatus } from "@/types";
import type { CreateDocumentInput, UpdateDocumentInput } from "@/lib/validations/document";

/**
 * Derive document status from expiry date and user's notification window.
 * Pure utility — no side effects.
 */
export function computeDocumentStatus(
  expiryDate: string | null | undefined,
  notificationWindowDays: number
): DocumentStatus {
  if (!expiryDate) return "incomplete";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return "incomplete";
  expiry.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 0) return "expired";
  if (daysUntilExpiry <= notificationWindowDays) return "expiring";
  return "valid";
}

function mapRow(row: typeof documents.$inferSelect): Document {
  return {
    id: row.id,
    vehicleId: row.vehicleId ?? undefined,
    userId: row.userId,
    type: row.type as Document["type"],
    label: row.label ?? undefined,
    expiryDate: row.expiryDate ?? undefined,
    storageUrl: row.storageUrl ?? undefined,
    storageKey: row.storageKey ?? undefined,
    parseStatus: row.parseStatus as Document["parseStatus"],
    status: row.status as Document["status"],
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export const documentService = {
  /** Stub: returns null until Epic 04 implements document management. */
  async nextExpiry(_vehicleId: string): Promise<string | null> {
    return null;
  },

  async listByVehicle(vehicleId: string, userId: string): Promise<Document[]> {
    // Access check (owner or viewer)
    await vehicleService.getWithAccessCheck(vehicleId, userId);

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const windowDays = user?.notificationWindowDays ?? 30;

    const docs = await db.query.documents.findMany({
      where: eq(documents.vehicleId, vehicleId),
      orderBy: [asc(documents.expiryDate)], // NULLs sort last in PostgreSQL ASC
    });

    return docs.map((doc) => ({
      ...mapRow(doc),
      status: computeDocumentStatus(doc.expiryDate ?? null, windowDays),
    }));
  },

  /**
   * Create a document record.
   * Handles storage preference: deletes temp R2 file for parse_only,
   * moves it to permanent key for full_storage.
   */
  async create(
    vehicleId: string,
    userId: string,
    data: CreateDocumentInput
  ): Promise<Document> {
    // Security: validate tempR2Key belongs to this user's temp namespace
    if (data.tempR2Key && !data.tempR2Key.startsWith(`${userId}/documents/temp/`)) {
      throw new ForbiddenError("Invalid file reference");
    }

    // Fetch user for storage preference + notification window
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const pref = user?.documentStoragePreference ?? "parse_only";
    const notificationWindowDays = user?.notificationWindowDays ?? 30;

    let storageUrl: string | null = null;
    let storageKey: string | null = null;

    if (data.tempR2Key) {
      if (pref === "full_storage") {
        // Move temp file to permanent key
        const ext = data.tempR2Key.endsWith(".png") ? "png" : "jpg";
        const permanentKey = `${userId}/documents/${vehicleId}/${crypto.randomUUID()}.${ext}`;
        await storageService.copyFile(data.tempR2Key, permanentKey);
        await storageService.deleteFile(data.tempR2Key).catch((e) =>
          logger.error({ error: e }, "Failed to delete temp R2 file after copy")
        );
        storageUrl = permanentKey; // non-null = "file is stored" indicator
        storageKey = permanentKey; // R2 object key used for signing and cron deletion
      } else {
        // parse_only: delete temp file after parsing
        await storageService.deleteFile(data.tempR2Key).catch((e) =>
          logger.error({ error: e }, "Failed to delete temp R2 file after parse")
        );
      }
    }

    const status = computeDocumentStatus(data.expiryDate, notificationWindowDays);

    const [doc] = await db
      .insert(documents)
      .values({
        vehicleId,
        userId,
        type: data.type,
        label: data.label,
        expiryDate: data.expiryDate ?? null,
        storageUrl,
        storageKey,
        parseStatus: data.parseStatus,
        status,
      })
      .returning();

    return mapRow(doc);
  },

  async update(docId: string, userId: string, data: UpdateDocumentInput): Promise<Document> {
    const doc = await db.query.documents.findFirst({ where: eq(documents.id, docId) });
    if (!doc) throw new NotFoundError("Document not found");

    if (doc.vehicleId) {
      const vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, doc.vehicleId) });
      if (!vehicle || vehicle.userId !== userId) {
        throw new ForbiddenError("Only the vehicle owner can edit this document");
      }
    } else {
      if (doc.userId !== userId) {
        throw new ForbiddenError("Only the document owner can edit it");
      }
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const effectiveExpiryDate = data.expiryDate !== undefined ? data.expiryDate : doc.expiryDate;
    const newStatus = computeDocumentStatus(
      effectiveExpiryDate,
      user?.notificationWindowDays ?? 30
    );

    const [updated] = await db
      .update(documents)
      .set({
        type: data.type ?? doc.type,
        label: data.label ?? doc.label,
        expiryDate: effectiveExpiryDate,
        parseStatus: effectiveExpiryDate ? "manual" : "incomplete",
        status: newStatus,
      })
      .where(eq(documents.id, docId))
      .returning();

    return mapRow(updated);
  },

  async createUserDocument(userId: string, data: CreateDocumentInput): Promise<Document> {
    // Security: validate tempR2Key belongs to this user's temp namespace
    if (data.tempR2Key && !data.tempR2Key.startsWith(`${userId}/documents/temp/`)) {
      throw new ForbiddenError("Invalid file reference");
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const pref = user?.documentStoragePreference ?? "parse_only";
    const notificationWindowDays = user?.notificationWindowDays ?? 30;

    let storageUrl: string | null = null;
    let storageKey: string | null = null;

    if (data.tempR2Key) {
      if (pref === "full_storage") {
        const ext = data.tempR2Key.endsWith(".png") ? "png" : "jpg";
        const permanentKey = `${userId}/documents/dl/${crypto.randomUUID()}.${ext}`;
        await storageService.copyFile(data.tempR2Key, permanentKey);
        await storageService.deleteFile(data.tempR2Key).catch((e) =>
          logger.error({ error: e }, "Failed to delete DL temp R2 file after copy")
        );
        storageUrl = permanentKey;
        storageKey = permanentKey;
      } else {
        await storageService.deleteFile(data.tempR2Key).catch((e) =>
          logger.error({ error: e }, "Failed to delete DL temp R2 file after parse")
        );
      }
    }

    const status = computeDocumentStatus(data.expiryDate, notificationWindowDays);

    const [doc] = await db
      .insert(documents)
      .values({
        vehicleId: null,
        userId,
        type: "DL",
        label: data.label,
        expiryDate: data.expiryDate ?? null,
        storageUrl,
        storageKey,
        parseStatus: data.parseStatus,
        status,
      })
      .returning();

    return mapRow(doc);
  },

  async listUserDocuments(userId: string): Promise<Document[]> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const windowDays = user?.notificationWindowDays ?? 30;

    const docs = await db.query.documents.findMany({
      where: and(eq(documents.userId, userId), isNull(documents.vehicleId)),
    });

    return docs.map((doc) => ({
      ...mapRow(doc),
      status: computeDocumentStatus(doc.expiryDate ?? null, windowDays),
    }));
  },

  async delete(docId: string, userId: string): Promise<void> {
    const doc = await db.query.documents.findFirst({ where: eq(documents.id, docId) });
    if (!doc) throw new NotFoundError("Document not found");

    if (doc.vehicleId) {
      const vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, doc.vehicleId) });
      if (!vehicle || vehicle.userId !== userId) {
        throw new ForbiddenError("Only the vehicle owner can delete this document");
      }
    } else {
      if (doc.userId !== userId) throw new ForbiddenError("Only the document owner can delete it");
    }

    if (doc.storageKey) {
      await storageService.deleteFile(doc.storageKey).catch((e) =>
        logger.error({ error: e, docId }, "Failed to delete document R2 file")
      );
    }

    await db.delete(documents).where(eq(documents.id, docId));
  },
};
