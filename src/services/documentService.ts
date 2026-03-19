import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { storageService } from "@/services/storageService";
import { vehicleService } from "@/services/vehicleService";
import { logger } from "@/lib/logger";
import { ForbiddenError } from "@/lib/errors";
import type { Document, DocumentStatus } from "@/types";
import type { CreateDocumentInput } from "@/lib/validations/document";

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

    if (data.tempR2Key) {
      if (pref === "full_storage") {
        // Move temp file to permanent key
        const ext = data.tempR2Key.endsWith(".png") ? "png" : "jpg";
        const permanentKey = `${userId}/documents/${vehicleId}/${crypto.randomUUID()}.${ext}`;
        await storageService.copyFile(data.tempR2Key, permanentKey);
        await storageService.deleteFile(data.tempR2Key).catch((e) =>
          logger.error({ error: e }, "Failed to delete temp R2 file after copy")
        );
        storageUrl = permanentKey; // store R2 key; generate signed URL on access
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
        parseStatus: data.parseStatus,
        status,
      })
      .returning();

    return mapRow(doc);
  },
};
