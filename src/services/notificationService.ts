import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  message: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResult {
  notifications: NotificationRecord[];
  unreadCount: number;
}

const PAGE_SIZE = 20;

type CreateOpts = {
  userId: string;
  type: string;
  message?: string;
  title?: string;
  body?: string;
  actionUrl?: string;
};

export const notificationService = {
  async create(
    userIdOrOpts: string | CreateOpts,
    type?: string,
    title?: string,
    body?: string,
    actionUrl?: string
  ): Promise<void> {
    let userId: string;
    let _type: string;
    let _title: string;
    let _body: string;
    let _actionUrl: string | null;

    if (typeof userIdOrOpts === "object") {
      userId = userIdOrOpts.userId;
      _type = userIdOrOpts.type;
      _title = userIdOrOpts.title ?? userIdOrOpts.message ?? "";
      _body = userIdOrOpts.body ?? userIdOrOpts.message ?? "";
      _actionUrl = userIdOrOpts.actionUrl ?? null;
    } else {
      userId = userIdOrOpts;
      _type = type ?? "";
      _title = title ?? "";
      _body = body ?? "";
      _actionUrl = actionUrl ?? null;
    }

    try {
      await db.insert(notifications).values({
        userId,
        type: _type,
        title: _title,
        body: _body,
        actionUrl: _actionUrl,
      });
    } catch (err) {
      logger.error({ err, userId, type: _type }, "notificationService.create failed");
    }
  },

  async listByUser(userId: string, page = 1): Promise<NotificationListResult> {
    const offset = (page - 1) * PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        orderBy: desc(notifications.createdAt),
        limit: PAGE_SIZE,
        offset,
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
    ]);

    const unreadCount = Number(countRows[0]?.count ?? 0);

    return {
      notifications: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        type: r.type,
        message: r.body,
        isRead: r.isRead,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      })),
      unreadCount,
    };
  },

  async markRead(notificationId: string, userId?: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  },

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  },

  async countUnread(userId: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(rows[0]?.count ?? 0);
  },
};
