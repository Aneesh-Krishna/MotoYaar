import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@/lib/errors";

export const userService = {
  async update(
    userId: string,
    data: Partial<{
      name: string;
      username: string;
      bio: string;
      profileImageUrl: string | null;
      instagramLink: string | null;
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
};
