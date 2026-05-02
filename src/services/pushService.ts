import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const pushService = {
  async subscribe(
    userId: string,
    sub: { endpoint: string; p256dh: string; auth: string }
  ): Promise<void> {
    await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: sub.endpoint,
        p256dhKey: sub.p256dh,
        authKey: sub.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { p256dhKey: sub.p256dh, authKey: sub.auth },
      });
  },

  async unsubscribe(_userId: string): Promise<void> {},

  async deleteAllForUser(userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  },

  async deleteSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  },

  async hasSubscription(_userId: string): Promise<boolean> {
    return false;
  },

  async getSubscriptionsForUser(userId: string): Promise<unknown[]> {
    return db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, userId),
    });
  },

  async sendNotification(
    _userId: string,
    _payload: { title: string; body: string; url?: string }
  ): Promise<void> {},
};
