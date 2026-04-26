import { db } from "@/lib/db/client";
import { users, documents, expenses, posts, vehicles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { storageService } from "@/services/storageService";
import { logger } from "@/lib/logger";

export const userService = {
  async update(
    userId: string,
    data: Partial<{
      name: string;
      username: string;
      bio: string;
      profileImageUrl: string | null;
      instagramLink: string | null;
      walkthroughSeen: boolean;
      documentStoragePreference: "parse_only" | "full_storage";
    }>
  ) {
    if (data.username) {
      const existing = await db.query.users.findFirst({
        where: eq(users.username, data.username),
      });
      if (existing && existing.id !== userId) {
        throw new ConflictError("Username is already taken");
      }
    }

    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) throw new NotFoundError("User not found");
    return updated;
  },

  async getById(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  async deleteAccount(userId: string): Promise<void> {
    logger.info({ userId }, "Account deletion initiated");

    const [user, docs, userExpenses, userPosts, userVehicles] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.documents.findMany({ where: eq(documents.userId, userId) }),
      db.query.expenses.findMany({ where: eq(expenses.userId, userId) }),
      db.query.posts.findMany({ where: eq(posts.userId, userId) }),
      db.query.vehicles.findMany({ where: eq(vehicles.userId, userId) }),
    ]);

    const keysToDelete: string[] = [];
    if (user?.profileImageUrl) keysToDelete.push(user.profileImageUrl);
    docs.forEach((d) => { if (d.storageKey) keysToDelete.push(d.storageKey); });
    userExpenses.forEach((e) => { if (e.receiptKey) keysToDelete.push(e.receiptKey); });
    userPosts.forEach((p) => { p.images?.forEach((k) => keysToDelete.push(k)); });
    userVehicles.forEach((v) => { if (v.imageUrl) keysToDelete.push(v.imageUrl); });

    await Promise.allSettled(
      keysToDelete.map((key) =>
        storageService.deleteFile(key).catch((err) =>
          logger.warn({ err, key }, "R2 delete failed in account deletion")
        )
      )
    );

    await db.delete(users).where(eq(users.id, userId));
    logger.info({ userId }, "Account deleted");
  },

};
