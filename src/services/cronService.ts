import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import { emailService, type ExpiringDoc } from "@/services/emailService";
import { notificationService } from "@/services/notificationService";
import { pushService } from "@/services/pushService";
import { sendPushNotification, type StoredPushSubscription } from "@/lib/push";
import { deleteObject } from "@/lib/r2";
import { logger } from "@/lib/logger";

export interface CronResult {
  processed: number;
  notified: number;
  deleted: number;
}

const MS_PER_DAY = 86_400_000;

type NotifyEntry = { type: string; daysUntilExpiry: number; vehicleName: string };

function localDateString(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export const cronService = {
  async runDocumentExpiryCheck(): Promise<CronResult> {
    // Only load docs that have an expiry date — skip storage-only docs entirely
    const [allDocs, allUsers] = await Promise.all([
      db.query.documents.findMany({ where: isNotNull(documents.expiryDate) }),
      db.query.users.findMany(),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const userNotifyMap = new Map<string, NotifyEntry[]>();

    let processed = 0;
    let deleted = 0;

    for (const doc of allDocs) {
      try {
        processed++;

        const user = userMap.get(doc.userId);
        if (!user || !doc.expiryDate) continue;

        const todayStr = localDateString();
        const expiryMs = Date.parse(doc.expiryDate as string);
        const todayMs = Date.parse(todayStr);
        const daysUntilExpiry = Math.round((expiryMs - todayMs) / MS_PER_DAY);

        // Step 1: Delete R2 file if expired > 10 days ago and file exists
        if (daysUntilExpiry < -10 && doc.storageKey) {
          await deleteObject(doc.storageKey);
          await db
            .update(documents)
            .set({ storageUrl: null, storageKey: null })
            .where(eq(documents.id, doc.id));
          deleted++;
        }

        // Step 2: Mark as expired
        if (daysUntilExpiry < 0) {
          await db
            .update(documents)
            .set({ status: "expired" })
            .where(eq(documents.id, doc.id));
        }

        // Step 3: Warning notification (expiring soon, not yet expired, not yet notified)
        if (
          daysUntilExpiry > 0 &&
          daysUntilExpiry <= user.notificationWindowDays &&
          !doc.expiryWarningNotifiedAt
        ) {
          await db
            .update(documents)
            .set({ expiryWarningNotifiedAt: new Date() })
            .where(eq(documents.id, doc.id));

          if (!userNotifyMap.has(doc.userId)) userNotifyMap.set(doc.userId, []);
          userNotifyMap.get(doc.userId)!.push({
            type: doc.type,
            daysUntilExpiry,
            vehicleName: "your vehicle",
          });
        }

        // Step 4: Expiry-day notification (expires today, not yet notified)
        if (daysUntilExpiry === 0 && !doc.expiryNotifiedAt) {
          await db
            .update(documents)
            .set({ expiryNotifiedAt: new Date() })
            .where(eq(documents.id, doc.id));

          if (!userNotifyMap.has(doc.userId)) userNotifyMap.set(doc.userId, []);
          userNotifyMap.get(doc.userId)!.push({
            type: doc.type,
            daysUntilExpiry: 0,
            vehicleName: "your vehicle",
          });
        }
      } catch (err) {
        logger.error({ err, docId: doc.id }, "Error processing document in cron");
      }
    }

    let notified = 0;

    for (const [userId, entries] of userNotifyMap) {
      const user = userMap.get(userId);
      if (!user || entries.length === 0) continue;

      try {
        const expiringToday = entries.filter((e) => e.daysUntilExpiry === 0);
        const expiringSoon = entries.filter((e) => e.daysUntilExpiry > 0);

        const bodyParts: string[] = [
          ...expiringSoon.map((e) => `${e.type} is expiring soon`),
          ...expiringToday.map((e) => `${e.type} expires today`),
        ];
        const body = bodyParts.join("; ");

        await notificationService.create(
          userId,
          "document_expiry_warning",
          "Document expiry alert",
          body,
          "/garage"
        );

        const expiringDocs: ExpiringDoc[] = entries.map((e) => ({
          type: e.type,
          vehicleName: e.vehicleName,
          expiryDate: new Date(),
          daysUntilExpiry: e.daysUntilExpiry,
        }));

        await emailService.sendDocumentExpiryEmail(userId, expiringDocs);

        if (user.pushNotificationsEnabled) {
          const subs = (await pushService.getSubscriptionsForUser(userId)) as StoredPushSubscription[];
          for (const sub of subs) {
            try {
              await sendPushNotification(sub, { title: "Document expiry alert", body });
            } catch (e: unknown) {
              if (
                e &&
                typeof e === "object" &&
                "statusCode" in e &&
                (e as { statusCode: number }).statusCode === 410
              ) {
                await pushService.deleteSubscription(sub.endpoint);
              }
            }
          }
        }

        notified++;
      } catch (err) {
        logger.error({ err, userId }, "Failed to send batch notification");
      }
    }

    return { processed, notified, deleted };
  },
};
