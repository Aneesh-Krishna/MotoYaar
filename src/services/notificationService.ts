import { logger } from "@/lib/logger";

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
};
