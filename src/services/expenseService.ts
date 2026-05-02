import { db } from "@/lib/db/client";
import { expenses, vehicles } from "@/lib/db/schema";
import { eq, desc, and, sql, lte, gte } from "drizzle-orm";
import { vehicleService } from "@/services/vehicleService";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/validations/expense";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { copyObject, deleteObject } from "@/lib/r2";
import type { Expense, RecentActivity } from "@/types";

function mapExpense(row: typeof expenses.$inferSelect): Expense {
  return {
    ...row,
    price: Number(row.price),
    reason: row.reason as Expense["reason"],
    vehicleId: row.vehicleId ?? undefined,
    tripId: row.tripId ?? undefined,
    whereText: row.whereText ?? undefined,
    comment: (row.comment ?? undefined) as Expense["comment"],
    receiptUrl: row.receiptUrl ?? undefined,
    receiptKey: row.receiptKey ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export const expenseService = {
  async create(
    userId: string,
    vehicleId: string | undefined,
    data: CreateExpenseInput
  ): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values({
        userId,
        vehicleId: vehicleId ?? null,
        price: String(data.price),
        currency: "INR",
        date: data.date,
        reason: data.reason,
        whereText: data.whereText ?? null,
        comment: data.comment ?? null,
        receiptUrl: null,
        receiptKey: null,
      })
      .returning();

    if (data.tempReceiptKey) {
      if (!data.tempReceiptKey.startsWith(`${userId}/receipts/temp/`)) {
        logger.error({ userId, expenseId: expense.id }, "tempReceiptKey ownership check failed — ignoring");
        return mapExpense(expense);
      }

      const ext = data.tempReceiptKey.split(".").pop() ?? "jpg";
      const permanentKey = `${userId}/receipts/${expense.id}/${crypto.randomUUID()}.${ext}`;

      try {
        await copyObject(data.tempReceiptKey, permanentKey);
        await deleteObject(data.tempReceiptKey).catch((e) =>
          logger.error({ e }, "Failed to delete temp receipt after copy")
        );

        const [updated] = await db
          .update(expenses)
          .set({ receiptKey: permanentKey, receiptUrl: permanentKey })
          .where(eq(expenses.id, expense.id))
          .returning();

        return mapExpense(updated);
      } catch (e) {
        logger.error({ e, expenseId: expense.id }, "Failed to finalize receipt — expense saved without receipt");
      }
    }

    return mapExpense(expense);
  },

  async update(expenseId: string, userId: string, data: UpdateExpenseInput): Promise<Expense> {
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
    });

    if (!expense) throw new NotFoundError("Expense not found");
    if (expense.userId !== userId) throw new ForbiddenError("You do not own this expense");
    if (expense.tripId) throw new ForbiddenError("Trip-linked expenses can only be edited via the trip");

    let newReceiptKey: string | null | undefined = undefined; // undefined = no change
    let newReceiptUrl: string | null | undefined = undefined;

    if (data.tempReceiptKey) {
      if (!data.tempReceiptKey.startsWith(`${userId}/receipts/temp/`)) {
        throw new ForbiddenError("Invalid receipt key");
      }
      // Replace: delete old, copy new temp to permanent
      if (expense.receiptKey) {
        await deleteObject(expense.receiptKey).catch((e) =>
          logger.error({ e, expenseId }, "Failed to delete old receipt during replace")
        );
      }
      const ext = data.tempReceiptKey.split(".").pop() ?? "jpg";
      const permanentKey = `${userId}/receipts/${expenseId}/${crypto.randomUUID()}.${ext}`;
      await copyObject(data.tempReceiptKey, permanentKey);
      await deleteObject(data.tempReceiptKey).catch((e) =>
        logger.error({ e }, "Failed to delete temp receipt after copy")
      );
      newReceiptKey = permanentKey;
      newReceiptUrl = permanentKey;
    } else if (data.removeReceipt && expense.receiptKey) {
      await deleteObject(expense.receiptKey).catch((e) =>
        logger.error({ e, expenseId }, "Failed to delete receipt from R2 during remove")
      );
      newReceiptKey = null;
      newReceiptUrl = null;
    }

    const [updated] = await db
      .update(expenses)
      .set({
        price: data.price !== undefined ? String(data.price) : undefined,
        date: data.date,
        reason: data.reason,
        whereText: data.whereText ?? null,
        comment: data.comment ?? null,
        ...(newReceiptKey !== undefined && { receiptKey: newReceiptKey }),
        ...(newReceiptUrl !== undefined && { receiptUrl: newReceiptUrl }),
      })
      .where(eq(expenses.id, expenseId))
      .returning();

    return mapExpense(updated);
  },

  async delete(expenseId: string, userId: string): Promise<void> {
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
    });

    if (!expense) throw new NotFoundError("Expense not found");
    if (expense.userId !== userId) throw new ForbiddenError("You do not own this expense");

    if (expense.tripId) {
      throw new ForbiddenError("Trip-linked expenses can only be deleted by deleting the trip");
    }

    if (expense.receiptKey) {
      await deleteObject(expense.receiptKey).catch((e) =>
        logger.error({ error: e, expenseId }, "Failed to delete receipt from R2")
      );
    }

    await db.delete(expenses).where(eq(expenses.id, expenseId));
  },

  async listByVehicle(vehicleId: string, userId: string): Promise<Expense[]> {
    await vehicleService.getWithAccessCheck(vehicleId, userId);

    const rows = await db.query.expenses.findMany({
      where: eq(expenses.vehicleId, vehicleId),
      orderBy: [desc(expenses.date)],
    });

    return rows.map(mapExpense);
  },

  async recentByUser(userId: string, limit: number): Promise<RecentActivity[]> {
    const rows = await db
      .select({
        expense: expenses,
        vehicleName: vehicles.name,
      })
      .from(expenses)
      .leftJoin(vehicles, eq(expenses.vehicleId, vehicles.id))
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date), desc(expenses.createdAt))
      .limit(limit);

    return rows.map(({ expense, vehicleName }) => ({
      ...mapExpense(expense),
      vehicleName: vehicleName ?? "No vehicle",
      kind: "expense" as const,
    }));
  },

  async sumByVehicle(vehicleId: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.price}), '0')` })
      .from(expenses)
      .where(eq(expenses.vehicleId, vehicleId));
    return parseFloat(row?.total ?? "0");
  },

  async lastServiceDate(vehicleId: string): Promise<string | null> {
    const [row] = await db
      .select({ date: expenses.date })
      .from(expenses)
      .where(and(eq(expenses.vehicleId, vehicleId), eq(expenses.reason, "Service")))
      .orderBy(desc(expenses.date))
      .limit(1);
    return row?.date ?? null;
  },

  async getByTripId(tripId: string, userId: string): Promise<Expense | null> {
    const row = await db.query.expenses.findFirst({
      where: and(eq(expenses.tripId, tripId), eq(expenses.userId, userId)),
    });
    return row ? mapExpense(row) : null;
  },

  async listByVehicleAndRange(
    vehicleId: string,
    userId: string,
    from?: string,
    to?: string
  ): Promise<Expense[]> {
    const conditions = [eq(expenses.vehicleId, vehicleId), eq(expenses.userId, userId)];
    if (from) conditions.push(gte(expenses.date, from));
    if (to) conditions.push(lte(expenses.date, to));

    const rows = await db
      .select()
      .from(expenses)
      .where(and(...conditions));
    return rows.map(mapExpense);
  },

  async listByUserAndRange(userId: string, from: string, to: string): Promise<Expense[]> {
    const rows = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.date, from), lte(expenses.date, to)));
    return rows.map(mapExpense);
  },
};
