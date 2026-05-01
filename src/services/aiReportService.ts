import { db } from "@/lib/db/client";
import { aiReports } from "@/lib/db/schema";
import { eq, desc, gte, and, count } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { generateReport } from "@/lib/anthropic";
import type { AiReport, ExpenseSnapshot } from "@/types";

function mapReport(row: typeof aiReports.$inferSelect): AiReport {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status as AiReport["status"],
    periodLabel: row.periodLabel ?? undefined,
    content: row.content ?? undefined,
    requestedAt: row.requestedAt instanceof Date ? row.requestedAt.toISOString() : String(row.requestedAt),
    completedAt: row.completedAt
      ? row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : String(row.completedAt)
      : undefined,
  };
}

export const aiReportService = {
  async listByUser(userId: string): Promise<AiReport[]> {
    const rows = await db
      .select()
      .from(aiReports)
      .where(eq(aiReports.userId, userId))
      .orderBy(desc(aiReports.requestedAt));
    return rows.map(mapReport);
  },

  async getById(reportId: string, userId: string): Promise<AiReport> {
    const row = await db.query.aiReports.findFirst({ where: eq(aiReports.id, reportId) });
    if (!row) throw new NotFoundError("Report not found");
    if (row.userId !== userId) throw new ForbiddenError("You do not have access to this report");
    return mapReport(row);
  },

  async requestReport(
    userId: string,
    periodLabel: string,
    snapshot: ExpenseSnapshot
  ): Promise<{ reportId: string }> {
    const [row] = await db
      .insert(aiReports)
      .values({ userId, status: "pending", periodLabel, content: JSON.stringify(snapshot) })
      .returning({ id: aiReports.id });
    return { reportId: row.id };
  },

  async checkQuota(userId: string): Promise<{ allowed: boolean; usedThisMonth: number; freePerMonth: number }> {
    const FREE_PER_MONTH = 1;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [result] = await db
      .select({ used: count() })
      .from(aiReports)
      .where(and(eq(aiReports.userId, userId), gte(aiReports.requestedAt, new Date(monthStart))));
    const usedThisMonth = result?.used ?? 0;
    return { allowed: usedThisMonth < FREE_PER_MONTH, usedThisMonth, freePerMonth: FREE_PER_MONTH };
  },

  async runGeneration(reportId: string, userId: string): Promise<void> {
    const row = await db.query.aiReports.findFirst({ where: eq(aiReports.id, reportId) });
    if (!row) throw new NotFoundError("Report not found");
    if (row.userId !== userId) throw new ForbiddenError("You do not have access to this report");

    await db.update(aiReports).set({ status: "generating" }).where(eq(aiReports.id, reportId));

    try {
      let snapshot: ExpenseSnapshot | null = null;
      try {
        if (row.content) snapshot = JSON.parse(row.content) as ExpenseSnapshot;
      } catch {
        // ignore parse errors — proceed with minimal data
      }

      const content = await generateReport({
        userId,
        period: row.periodLabel ?? "Recent period",
        totalSpend: snapshot?.totalExpenses ?? 0,
        currency: snapshot?.currency ?? "INR",
        vehicles: snapshot?.topVehicle
          ? [{ name: snapshot.topVehicle.name, totalSpend: snapshot.topVehicle.total, breakdown: [] }]
          : [],
      });

      await db
        .update(aiReports)
        .set({ status: "ready", content, completedAt: new Date() })
        .where(eq(aiReports.id, reportId));
    } catch {
      await db.update(aiReports).set({ status: "failed" }).where(eq(aiReports.id, reportId));
      throw new Error("Report generation failed");
    }
  },
};
