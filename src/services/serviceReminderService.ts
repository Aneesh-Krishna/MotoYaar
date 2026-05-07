import { db } from "@/lib/db/client";
import { serviceReminders, expenses, users } from "@/lib/db/schema";
import { eq, and, desc, isNotNull, isNull } from "drizzle-orm";
import { notificationService } from "@/services/notificationService";
import { pushService } from "@/services/pushService";
import { sendPushNotification, type StoredPushSubscription } from "@/lib/push";
import { logger } from "@/lib/logger";
import type { ServiceReminder } from "@/types";
export { SERVICE_REMINDER_DEFAULTS } from "@/lib/serviceReminderConstants";

function mapReminder(row: typeof serviceReminders.$inferSelect): ServiceReminder {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    userId: row.userId,
    serviceType: row.serviceType,
    kmInterval: row.kmInterval ?? undefined,
    dayInterval: row.dayInterval ?? undefined,
    lastServicedKm: row.lastServicedKm ?? undefined,
    lastServicedAt: row.lastServicedAt ?? undefined,
    notifiedAt: row.notifiedAt ? row.notifiedAt.toISOString() : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getLatestOdometer(vehicleId: string): Promise<number | null> {
  const row = await db.query.expenses.findFirst({
    where: and(eq(expenses.vehicleId, vehicleId), eq(expenses.reason, "Fuel"), isNotNull(expenses.odometerKm)),
    orderBy: [desc(expenses.date), desc(expenses.createdAt)],
  });
  return row?.odometerKm ?? null;
}

export const serviceReminderService = {
  async listByVehicle(vehicleId: string, userId: string): Promise<ServiceReminder[]> {
    const rows = await db.query.serviceReminders.findMany({
      where: and(eq(serviceReminders.vehicleId, vehicleId), eq(serviceReminders.userId, userId)),
      orderBy: [desc(serviceReminders.createdAt)],
    });
    return rows.map(mapReminder);
  },

  async create(
    userId: string,
    vehicleId: string,
    data: { serviceType: string; kmInterval?: number | null; dayInterval?: number | null }
  ): Promise<ServiceReminder> {
    if (!data.kmInterval && !data.dayInterval) {
      throw new Error("At least one of kmInterval or dayInterval must be provided");
    }
    const [row] = await db
      .insert(serviceReminders)
      .values({
        userId,
        vehicleId,
        serviceType: data.serviceType,
        kmInterval: data.kmInterval ?? null,
        dayInterval: data.dayInterval ?? null,
        lastServicedAt: new Date().toISOString().split("T")[0],
      })
      .returning();
    return mapReminder(row);
  },

  async markServiced(reminderId: string, userId: string): Promise<ServiceReminder> {
    const reminder = await db.query.serviceReminders.findFirst({
      where: eq(serviceReminders.id, reminderId),
    });
    if (!reminder) throw new Error("Reminder not found");
    if (reminder.userId !== userId) throw new Error("Forbidden");

    const latestOdometer = await getLatestOdometer(reminder.vehicleId);
    const today = new Date().toISOString().split("T")[0];

    const [updated] = await db
      .update(serviceReminders)
      .set({
        lastServicedKm: latestOdometer ?? reminder.lastServicedKm,
        lastServicedAt: today,
        notifiedAt: null,
      })
      .where(eq(serviceReminders.id, reminderId))
      .returning();
    return mapReminder(updated);
  },

  async delete(reminderId: string, userId: string): Promise<void> {
    const reminder = await db.query.serviceReminders.findFirst({
      where: eq(serviceReminders.id, reminderId),
    });
    if (!reminder) throw new Error("Reminder not found");
    if (reminder.userId !== userId) throw new Error("Forbidden");
    await db.delete(serviceReminders).where(eq(serviceReminders.id, reminderId));
  },

  // Called from expenseService.create() when a fuel expense with odometer is logged
  async checkKmRemindersForVehicle(vehicleId: string, currentOdometer: number): Promise<void> {
    const reminders = await db.query.serviceReminders.findMany({
      where: and(eq(serviceReminders.vehicleId, vehicleId), isNotNull(serviceReminders.kmInterval)),
    });

    for (const reminder of reminders) {
      try {
        if (!reminder.kmInterval) continue;
        if (!reminder.lastServicedKm) {
          // No baseline yet — set the current odometer as baseline without notifying
          await db
            .update(serviceReminders)
            .set({ lastServicedKm: currentOdometer })
            .where(and(eq(serviceReminders.id, reminder.id), isNull(serviceReminders.lastServicedKm)));
          continue;
        }

        const kmSinceService = currentOdometer - reminder.lastServicedKm;
        if (kmSinceService < reminder.kmInterval) continue;

        // Check if already notified recently (within 7 days)
        if (reminder.notifiedAt) {
          const daysSinceNotified =
            (Date.now() - reminder.notifiedAt.getTime()) / 86_400_000;
          if (daysSinceNotified < 7) continue;
        }

        await db
          .update(serviceReminders)
          .set({ notifiedAt: new Date() })
          .where(eq(serviceReminders.id, reminder.id));

        await notificationService.create({
          userId: reminder.userId,
          type: "service_reminder",
          title: "Service Reminder",
          body: `Your vehicle is due for ${reminder.serviceType}`,
          actionUrl: `/garage/${vehicleId}?tab=reminders`,
        });
      } catch (err) {
        logger.error({ err, reminderId: reminder.id }, "Failed to process km reminder");
      }
    }
  },

  // Called from daily cron — checks date-based reminders
  async runDateReminderCheck(): Promise<{ processed: number; notified: number }> {
    const reminders = await db.query.serviceReminders.findMany({
      where: isNotNull(serviceReminders.dayInterval),
    });

    let processed = 0;
    let notified = 0;

    for (const reminder of reminders) {
      try {
        processed++;
        if (!reminder.dayInterval || !reminder.lastServicedAt) continue;

        const lastServicedMs = Date.parse(reminder.lastServicedAt as string);
        const dueDateMs = lastServicedMs + reminder.dayInterval * 86_400_000;
        const now = Date.now();

        if (now < dueDateMs) continue;

        // Check notified_at — skip if notified within last 7 days
        if (reminder.notifiedAt) {
          const daysSinceNotified = (now - reminder.notifiedAt.getTime()) / 86_400_000;
          if (daysSinceNotified < 7) continue;
        }

        await db
          .update(serviceReminders)
          .set({ notifiedAt: new Date() })
          .where(eq(serviceReminders.id, reminder.id));

        const body = `Your vehicle is due for ${reminder.serviceType}`;

        await notificationService.create({
          userId: reminder.userId,
          type: "service_reminder",
          title: "Service Reminder",
          body,
          actionUrl: `/garage/${reminder.vehicleId}?tab=reminders`,
        });

        const user = await db.query.users.findFirst({ where: eq(users.id, reminder.userId) });
        if (user?.pushNotificationsEnabled) {
          const subs = (await pushService.getSubscriptionsForUser(reminder.userId)) as StoredPushSubscription[];
          for (const sub of subs) {
            await sendPushNotification(sub, { title: "Service Reminder", body }).catch((e: unknown) => {
              if (e && typeof e === "object" && "statusCode" in e && (e as { statusCode: number }).statusCode === 410) {
                pushService.deleteSubscription((sub as { endpoint: string }).endpoint);
              }
            });
          }
        }

        notified++;
      } catch (err) {
        logger.error({ err, reminderId: reminder.id }, "Failed to process date reminder");
      }
    }

    return { processed, notified };
  },
};
