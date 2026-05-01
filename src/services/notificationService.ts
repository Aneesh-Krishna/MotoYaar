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

// Stub — will be fully implemented in Story 8.x
export const notificationService = {
  async create(data: {
    userId: string;
    type: string;
    message: string;
    referenceId?: string;
  }): Promise<void> {
    logger.info({ data }, "notificationService.create called (stub)");
  },

  async listByUser(_userId: string, _page?: number): Promise<NotificationListResult> {
    return { notifications: [], unreadCount: 0 };
  },

  async markRead(_notificationId: string, _userId?: string): Promise<void> {},

  async markAllRead(_userId: string): Promise<void> {},

  async countUnread(_userId: string): Promise<number> {
    return 0;
  },
};
