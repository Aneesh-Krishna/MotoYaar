import { deleteObject, putObject, copyObject } from "@/lib/r2";
import { logger } from "@/lib/logger";

export const storageService = {
  /** Upload a buffer directly to R2 under the given key */
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
    await putObject(key, body, contentType);
    logger.info({ key }, "storageService.uploadFile: uploaded");
  },

  /** Copy an R2 object from sourceKey to destKey */
  async copyFile(sourceKey: string, destKey: string): Promise<void> {
    await copyObject(sourceKey, destKey);
    logger.info({ sourceKey, destKey }, "storageService.copyFile: copied");
  },

  /** Delete an object from R2 by key */
  async deleteFile(key: string): Promise<void> {
    await deleteObject(key);
    logger.info({ key }, "storageService.deleteFile: deleted");
  },
};
