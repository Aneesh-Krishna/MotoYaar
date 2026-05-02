import { db } from "@/lib/db/client";
import {
  adminAccounts,
  users,
  vehicles,
  posts,
  comments,
  aiReports,
  postReports,
  documents,
} from "@/lib/db/schema";
import { eq, and, gte, ilike, or, isNotNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/resend";
import { deleteObject } from "@/lib/r2";
import { NotFoundError } from "@/lib/errors";
import { notificationService } from "@/services/notificationService";
import { userService } from "@/services/userService";
import { emailService } from "@/services/emailService";
import { logger } from "@/lib/logger";

export interface AdminPost {
  id: string;
  userId: string;
  title: string;
  description: string;
  isPinned: boolean;
  isHidden: boolean;
  score: number;
  createdAt: string;
  author: { id: string; name: string; email?: string | null };
}

export interface ReportedPost {
  id: string;
  postId: string;
  reporterUserId: string;
  reason: string;
  description: string | null;
  createdAt: string;
  title: string;
  isHidden: boolean;
  descriptionPreview: string;
  reportCount: number;
  reasonBreakdown: Record<string, number>;
  author: { id: string; name: string; email?: string | null };
}

export interface AdminUser {
  id: string;
  name: string;
  email?: string | null;
  googleId: string;
  username: string | null;
  status: string;
  vehicleCount: number;
  postCount: number;
  createdAt: string;
}

export const adminService = {
  async login(email: string, password: string): Promise<{ id: string; email: string }> {
    const admin = await db.query.adminAccounts.findFirst({
      where: eq(adminAccounts.email, email.toLowerCase()),
    });
    if (!admin) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new Error("Invalid credentials");

    return { id: admin.id, email: admin.email };
  },

  async getAllPosts(): Promise<AdminPost[]> {
    return [];
  },

  async listPosts(): Promise<AdminPost[]> {
    return [];
  },

  async getPost(_postId: string): Promise<AdminPost | null> {
    return null;
  },

  async restorePost(postId: string, _adminId: string): Promise<void> {
    await db.update(posts).set({ isHidden: false }).where(eq(posts.id, postId));
  },

  async removePost(postId: string, _adminId: string): Promise<void> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");

    for (const key of post.images ?? []) {
      await deleteObject(key);
    }

    await db.delete(posts).where(eq(posts.id, postId));
  },

  async getReportedPosts(): Promise<ReportedPost[]> {
    return [];
  },

  async listReportedPosts(): Promise<ReportedPost[]> {
    return [];
  },

  async hidePost(_postId: string): Promise<void> {},

  async listUsers(): Promise<AdminUser[]> {
    return [];
  },

  async searchUsers(query: string): Promise<AdminUser[]> {
    const where = query
      ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`))
      : undefined;

    const rows = await db.query.users.findMany({
      where,
      limit: 50,
      extras: {
        vehicleCount:
          sql<number>`(SELECT COUNT(*)::int FROM vehicles WHERE vehicles.user_id = users.id)`.as(
            "vehicle_count"
          ),
        postCount:
          sql<number>`(SELECT COUNT(*)::int FROM posts WHERE posts.user_id = users.id)`.as(
            "post_count"
          ),
      },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      googleId: r.googleId,
      username: r.username ?? null,
      status: r.status,
      vehicleCount: Number((r as typeof r & { vehicleCount: number }).vehicleCount ?? 0),
      postCount: Number((r as typeof r & { postCount: number }).postCount ?? 0),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  },

  async getUser(userId: string): Promise<AdminUser> {
    const [user, vehicleCountRows, postCountRows] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.select({ count: sql<string>`count(*)` }).from(vehicles).where(eq(vehicles.userId, userId)),
      db.select({ count: sql<string>`count(*)` }).from(posts).where(eq(posts.userId, userId)),
    ]);

    if (!user) throw new NotFoundError("User not found");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      googleId: user.googleId,
      username: user.username ?? null,
      status: user.status,
      vehicleCount: Number(vehicleCountRows[0]?.count ?? 0),
      postCount: Number(postCountRows[0]?.count ?? 0),
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
    };
  },

  async suspendUser(userId: string, days: number, _adminId?: string): Promise<void> {
    const suspendedUntil = new Date(Date.now() + days * 86_400_000);
    await db
      .update(users)
      .set({ status: "suspended", suspendedUntil })
      .where(eq(users.id, userId));

    const dayLabel = days === 1 ? "1 day" : `${days} days`;

    await notificationService.create(
      userId,
      "admin_suspension",
      "Account suspended",
      `Your account has been suspended for ${dayLabel}.`,
      "/community"
    );

    try {
      const user = await userService.getById(userId);
      if (user.email) {
        await sendEmail(
          user.email,
          "Account suspended — MotoYaar",
          `<p>Your account has been suspended for ${dayLabel}.</p>`
        );
      }
    } catch (err) {
      logger.error({ err, userId }, "suspendUser: email delivery failed");
    }
  },

  async unsuspendUser(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ status: "active", suspendedUntil: null })
      .where(eq(users.id, userId));
  },

  async banUser(userId: string, _adminId?: string): Promise<void> {
    await db.update(users).set({ status: "banned" }).where(eq(users.id, userId));

    await notificationService.create(
      userId,
      "admin_ban",
      "Account banned",
      "Your account has been permanently banned for violating community guidelines.",
      "/community"
    );

    try {
      const user = await userService.getById(userId);
      if (user.email) {
        await sendEmail(
          user.email,
          "Account banned — MotoYaar",
          "<p>Your account has been permanently banned for violating community guidelines.</p>"
        );
      }
    } catch (err) {
      logger.error({ err, userId }, "banUser: email delivery failed");
    }
  },

  async updateUserStatus(
    userId: string,
    action: "warn" | "suspend" | "ban" | "lift" | "unban" | "relink",
    opts?: { suspendDays?: number; googleId?: string; adminId?: string }
  ): Promise<void> {
    if (action === "lift") {
      await db
        .update(users)
        .set({ status: "active", suspendedUntil: null })
        .where(eq(users.id, userId));
    } else if (action === "unban") {
      await db.update(users).set({ status: "active" }).where(eq(users.id, userId));
    } else if (action === "relink") {
      if (!opts?.googleId) throw new Error("googleId required");
      await db.update(users).set({ googleId: opts.googleId }).where(eq(users.id, userId));
    } else if (action === "suspend") {
      if (!opts?.suspendDays) throw new Error("suspendDays required");
      await this.suspendUser(userId, opts.suspendDays, opts.adminId);
    } else if (action === "ban") {
      await this.banUser(userId, opts?.adminId);
    } else if (action === "warn") {
      await db.update(users).set({ status: "warned" }).where(eq(users.id, userId));
    }
  },

  async getAnalytics(): Promise<Record<string, unknown>> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsersRows,
      newUsersWeekRows,
      newUsersMonthRows,
      totalVehiclesRows,
      totalPostsRows,
      totalCommentsRows,
      aiReportsMonthRows,
      pendingReportsRows,
    ] = await Promise.all([
      db.select({ count: sql<string>`count(*)` }).from(users),
      db.select({ count: sql<string>`count(*)` }).from(users).where(gte(users.createdAt, weekAgo)),
      db
        .select({ count: sql<string>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, monthAgo)),
      db.select({ count: sql<string>`count(*)` }).from(vehicles),
      db.select({ count: sql<string>`count(*)` }).from(posts),
      db.select({ count: sql<string>`count(*)` }).from(comments),
      db
        .select({ count: sql<string>`count(*)` })
        .from(aiReports)
        .where(gte(aiReports.requestedAt, monthStart)),
      db.select({ count: sql<string>`count(*)` }).from(postReports),
    ]);

    const [parseSuccessRate, weeklySignups, weeklyActivity] = await Promise.all([
      this._getParseSuccessRate(monthAgo),
      this._getWeeklySignups(monthAgo),
      this._getWeeklyActivity(monthAgo),
    ]);

    return {
      totalUsers: Number(totalUsersRows[0]?.count ?? 0),
      newUsersThisWeek: Number(newUsersWeekRows[0]?.count ?? 0),
      newUsersThisMonth: Number(newUsersMonthRows[0]?.count ?? 0),
      totalVehicles: Number(totalVehiclesRows[0]?.count ?? 0),
      totalPosts: Number(totalPostsRows[0]?.count ?? 0),
      totalComments: Number(totalCommentsRows[0]?.count ?? 0),
      aiReportsThisMonth: Number(aiReportsMonthRows[0]?.count ?? 0),
      pendingReportsCount: Number(pendingReportsRows[0]?.count ?? 0),
      parseSuccessRate,
      weeklySignups,
      weeklyActivity,
    };
  },

  async _getParseSuccessRate(since: Date): Promise<number> {
    const totalRows = await db
      .select({ count: sql<string>`count(*)` })
      .from(documents)
      .where(gte(documents.createdAt, since));
    const total = Number(totalRows[0]?.count ?? 0);
    if (total === 0) return 100;

    const parsedRows = await db
      .select({ count: sql<string>`count(*)` })
      .from(documents)
      .where(and(gte(documents.createdAt, since), eq(documents.parseStatus, "parsed")));
    const parsed = Number(parsedRows[0]?.count ?? 0);

    return Math.round((parsed / total) * 100);
  },

  async _getWeeklySignups(since: Date): Promise<Array<{ week: string; count: number }>> {
    const rows = await db.execute(sql`
      SELECT date_trunc('week', created_at)::date::text AS week, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1
    `);
    return (rows as unknown as Array<{ week: string; count: string | number }>).map((r) => ({
      week: r.week,
      count: Number(r.count),
    }));
  },

  async _getWeeklyActivity(_since: Date): Promise<unknown[]> {
    return [];
  },

  async bulkInviteUsers(
    emails: string[],
    _adminId?: string
  ): Promise<{ sent: number; alreadyRegistered: number; invalid: number; failed: number }> {
    let sent = 0;
    let alreadyRegistered = 0;
    let invalid = 0;
    let failed = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of emails) {
      if (!emailRegex.test(email)) {
        invalid++;
        continue;
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      if (existing) {
        alreadyRegistered++;
        continue;
      }

      try {
        await emailService.sendBetaInviteEmail(email);
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, alreadyRegistered, invalid, failed };
  },
};
