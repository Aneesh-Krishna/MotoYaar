import { logger } from "@/lib/logger";

// Stub — will be fully implemented in Story 1.3 — Cloudflare R2 Storage
export const storageService = {
  async deleteFile(key: string): Promise<void> {
    logger.info({ key }, "storageService.deleteFile called (stub)");
  },
};
