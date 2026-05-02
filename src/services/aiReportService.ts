import { db } from "@/lib/db/client";
import { aiReports } from "@/lib/db/schema";
import { eq, desc, gte, and, ne } from "drizzle-orm";
import { NotFoundError, ForbiddenError, QuotaExceededError, BadRequestError } from "@/lib/errors";
import { generateReport } from "@/lib/anthropic";
import { notificationService } from "@/services/notificationService";
import { pushService } from "@/services/pushService";
import { userService } from "@/services/userService";
import { sendEmail } from "@/lib/resend";
import { sendPushNotification, type StoredPushSubscription } from "@/lib/push";
import { logger } from "@/lib/logger";
import type { AiReport, ExpenseSnapshot } from "@/types";

function mapAiReport(row: typeof aiReports.$inferSelect): AiReport {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status as AiReport["status"],
    periodLabel: row.periodLabel ?? undefined,
    content: row.content ?? undefined,
    requestedAt: row.requestedAt instanceof Date ? row.requestedAt.toISOString() : String(row.requestedAt),
    completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : row.completedAt ?? undefined,
  };
}

export const FREE_REPORTS_PER_MONTH = 1;

export const aiReportService = {
  async listByUser(userId: string): Promise<AiReport[]> {
    const rows = await db.query.aiReports.findMany({
      where: eq(aiReports.userId, userId),
      orderBy: desc(aiReports.requestedAt),
    });
    return rows.map(mapAiReport);
  },

  async getById(reportId: string, userId: string): Promise<AiReport> {
    const row = await db.query.aiReports.findFirst({ where: eq(aiReports.id, reportId) });
    if (!row) throw new NotFoundError("Report not found");
    if (row.userId !== userId) throw new ForbiddenError("You do not have access to this report");
    return mapAiReport(row);
  },

  async checkQuota(userId: string): Promise<{ allowed: boolean; usedThisMonth: number; freePerMonth: number }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const rows = await db.query.aiReports.findMany({
      where: and(
        eq(aiReports.userId, userId),
        gte(aiReports.requestedAt, monthStart),
        ne(aiReports.status, "failed")
      ),
    });
    const usedThisMonth = rows.length;
    return { allowed: usedThisMonth < FREE_REPORTS_PER_MONTH, usedThisMonth, freePerMonth: FREE_REPORTS_PER_MONTH };
  },

  async requestReport(
    userId: string,
    periodLabel: string,
    snapshot: ExpenseSnapshot
  ): Promise<{ reportId: string }> {
    if (snapshot.totalExpenses === 0) {
      throw new BadRequestError("No expenses to report for the selected period");
    }
    const quota = await this.checkQuota(userId);
    if (!quota.allowed) {
      throw new QuotaExceededError("You have reached your monthly AI report limit");
    }
    const [row] = await db
      .insert(aiReports)
      .values({ userId, status: "pending", periodLabel, expenseSnapshot: snapshot })
      .returning({ id: aiReports.id });
    return { reportId: row.id };
  },

  async runGeneration(reportId: string, userId: string): Promise<void> {
    const row = await db.query.aiReports.findFirst({ where: eq(aiReports.id, reportId) });
    if (!row) return;
    if (row.status !== "pending") return;

    if (!row.expenseSnapshot) {
      logger.error({ reportId, userId }, "runGeneration: expenseSnapshot is missing");
      await db.update(aiReports).set({ status: "failed" }).where(eq(aiReports.id, reportId));
      return;
    }

    try {
      const snapshot = row.expenseSnapshot as ExpenseSnapshot;
      const content = await generateReport({
        userId,
        period: row.periodLabel ?? "Recent period",
        totalSpend: snapshot.totalExpenses,
        currency: snapshot.currency,
        vehicles: snapshot.topVehicle
          ? [{ name: snapshot.topVehicle.name, totalSpend: snapshot.topVehicle.total, breakdown: [] }]
          : [],
      });

      await db
        .update(aiReports)
        .set({ status: "ready", content, completedAt: new Date() })
        .where(eq(aiReports.id, reportId));
    } catch (err) {
      logger.error({ err, reportId, userId }, "runGeneration: generation failed");
      await db.update(aiReports).set({ status: "failed" }).where(eq(aiReports.id, reportId));
      return;
    }

    // === Notification delivery (non-fatal — must not flip status back to failed) ===

    const periodLabel = row.periodLabel ?? "Recent period";

    try {
      await notificationService.create(
        userId,
        "ai_report_ready",
        "Your AI report is ready",
        `Your spending report for ${periodLabel} is ready to view.`,
        `/reports/ai/${reportId}`
      );
    } catch (err) {
      logger.error({ err, userId, reportId }, "runGeneration: in-app notification failed");
    }

    let user: Awaited<ReturnType<typeof userService.getById>> | null = null;
    try {
      user = await userService.getById(userId);
    } catch {
      // non-fatal
    }

    if (user?.pushNotificationsEnabled) {
      try {
        const subs = await pushService.getSubscriptionsForUser(userId);
        await Promise.all(
          (subs as StoredPushSubscription[]).map(async (sub) => {
            try {
              await sendPushNotification(sub, {
                title: "Your AI report is ready",
                body: `Your spending report for ${periodLabel} is ready.`,
              });
            } catch (err: unknown) {
              if (
                err &&
                typeof err === "object" &&
                "statusCode" in err &&
                (err as { statusCode: number }).statusCode === 410
              ) {
                await pushService.deleteSubscription(sub.endpoint);
              }
            }
          })
        );
      } catch {
        // non-fatal
      }
    }

    if (user?.email) {
      try {
        await sendEmail(
          user.email,
          "Your AI report is ready",
          `<p>Your spending report for ${periodLabel} is ready to view.</p>`
        );
      } catch (err) {
        logger.warn({ err, userId, reportId }, "AI report email delivery failed");
      }
    }
  },
};
