import { db } from "@/lib/db/client";
import { expenses, vehicles } from "@/lib/db/schema";
import { eq, desc, and, sql, lte, gte, isNotNull, isNull, ne } from "drizzle-orm";
import { vehicleService } from "@/services/vehicleService";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/validations/expense";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { copyObject, deleteObject } from "@/lib/r2";
import type { Expense, RecentActivity } from "@/types";
import { serviceReminderService } from "@/services/serviceReminderService";

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
    litresFilled: row.litresFilled != null ? Number(row.litresFilled) : undefined,
    odometerKm: row.odometerKm ?? undefined,
    kmpl: row.kmpl != null ? Number(row.kmpl) : undefined,
    serviceCenterId: row.serviceCenterId ?? undefined,
    fuelStationId: row.fuelStationId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findPrevFuelExpense(
  vehicleId: string,
  excludeId?: string
): Promise<typeof expenses.$inferSelect | null> {
  const conditions = [
    eq(expenses.vehicleId, vehicleId),
    eq(expenses.reason, "Fuel"),
    isNotNull(expenses.odometerKm),
    isNull(expenses.deletedAt),
    ...(excludeId ? [ne(expenses.id, excludeId)] : []),
  ];
  return (
    (await db.query.expenses.findFirst({
      where: and(...conditions),
      orderBy: [desc(expenses.date), desc(expenses.createdAt)],
    })) ?? null
  );
}

export const expenseService = {
  async create(
    userId: string,
    vehicleId: string | undefined,
    data: CreateExpenseInput
  ): Promise<Expense> {
    let prevExpense: typeof expenses.$inferSelect | null = null;
    let kmplForPrev: number | null = null;

    if (
      vehicleId &&
      data.reason === "Fuel" &&
      data.odometerKm != null &&
      data.litresFilled != null
    ) {
      prevExpense = await findPrevFuelExpense(vehicleId);
      if (prevExpense?.odometerKm != null) {
        const distanceKm = data.odometerKm - prevExpense.odometerKm;
        if (distanceKm > 0) {
          kmplForPrev = parseFloat((distanceKm / data.litresFilled).toFixed(2));
        }
      }
    }

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
        litresFilled: data.litresFilled != null ? String(data.litresFilled) : null,
        odometerKm: data.odometerKm ?? null,
        kmpl: null,
        serviceCenterId: data.serviceCenterId ?? null,
        fuelStationId: data.fuelStationId ?? null,
      })
      .returning();

    if (prevExpense && kmplForPrev != null) {
      await db
        .update(expenses)
        .set({ kmpl: String(kmplForPrev) })
        .where(eq(expenses.id, prevExpense.id));
    }

    // Trigger km-based service reminder check when odometer is logged on a fuel expense
    if (vehicleId && data.reason === "Fuel" && data.odometerKm != null) {
      serviceReminderService
        .checkKmRemindersForVehicle(vehicleId, data.odometerKm)
        .catch((err) => logger.error({ err }, "km reminder check failed"));
    }

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

    const updatedReason = data.reason ?? expense.reason;
    const updatedOdometer = data.odometerKm !== undefined ? data.odometerKm : expense.odometerKm;
    const updatedLitres = data.litresFilled !== undefined ? data.litresFilled : (expense.litresFilled != null ? Number(expense.litresFilled) : null);

    // When odometer or litres change on a Fuel expense, recalculate kmpl on the previous expense
    let prevExpenseForKmpl: typeof expenses.$inferSelect | null = null;
    let kmplForPrev: number | null = null;
    const odometerOrLitresChanged =
      data.odometerKm !== undefined || data.litresFilled !== undefined || data.reason !== undefined;

    if (
      updatedReason === "Fuel" &&
      expense.vehicleId &&
      updatedOdometer != null &&
      updatedLitres != null &&
      odometerOrLitresChanged
    ) {
      prevExpenseForKmpl = await findPrevFuelExpense(expense.vehicleId, expenseId);
      if (prevExpenseForKmpl?.odometerKm != null) {
        const distanceKm = updatedOdometer - prevExpenseForKmpl.odometerKm;
        if (distanceKm > 0) {
          kmplForPrev = parseFloat((distanceKm / updatedLitres).toFixed(2));
        }
      }
    }

    // If reason changed away from Fuel, clear kmpl on the previous expense if it was set by this expense
    if (updatedReason !== "Fuel" && expense.reason === "Fuel" && expense.vehicleId) {
      const prevForClear = await findPrevFuelExpense(expense.vehicleId, expenseId);
      if (prevForClear) {
        await db.update(expenses).set({ kmpl: null }).where(eq(expenses.id, prevForClear.id));
      }
    }

    const [updated] = await db
      .update(expenses)
      .set({
        price: data.price !== undefined ? String(data.price) : undefined,
        date: data.date,
        reason: data.reason,
        whereText: data.whereText ?? null,
        comment: data.comment ?? null,
        litresFilled: data.litresFilled !== undefined ? (data.litresFilled != null ? String(data.litresFilled) : null) : undefined,
        odometerKm: data.odometerKm !== undefined ? (data.odometerKm ?? null) : undefined,
        kmpl: undefined,
        ...(newReceiptKey !== undefined && { receiptKey: newReceiptKey }),
        ...(newReceiptUrl !== undefined && { receiptUrl: newReceiptUrl }),
        ...(data.serviceCenterId !== undefined && { serviceCenterId: data.serviceCenterId ?? null }),
        ...(data.fuelStationId !== undefined && { fuelStationId: data.fuelStationId ?? null }),
      })
      .where(eq(expenses.id, expenseId))
      .returning();

    if (prevExpenseForKmpl && kmplForPrev != null) {
      await db
        .update(expenses)
        .set({ kmpl: String(kmplForPrev) })
        .where(eq(expenses.id, prevExpenseForKmpl.id));
    } else if (prevExpenseForKmpl && kmplForPrev == null && odometerOrLitresChanged) {
      // Distance was invalid (<=0) or missing data — clear stale kmpl on prev
      await db.update(expenses).set({ kmpl: null }).where(eq(expenses.id, prevExpenseForKmpl.id));
    }

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

    if (expense.reason === "Service") {
      // Soft-delete service expenses to preserve vehicle history tombstones
      await db
        .update(expenses)
        .set({ deletedAt: new Date(), deletedByOwner: true })
        .where(eq(expenses.id, expenseId));
      return;
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
      where: and(eq(expenses.vehicleId, vehicleId), isNull(expenses.deletedAt)),
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
      .where(and(eq(expenses.userId, userId), isNull(expenses.deletedAt)))
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
      .where(and(eq(expenses.vehicleId, vehicleId), isNull(expenses.deletedAt)));
    return parseFloat(row?.total ?? "0");
  },

  async lastServiceDate(vehicleId: string): Promise<string | null> {
    const [row] = await db
      .select({ date: expenses.date })
      .from(expenses)
      .where(and(eq(expenses.vehicleId, vehicleId), eq(expenses.reason, "Service"), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.date))
      .limit(1);
    return row?.date ?? null;
  },

  async getByTripId(tripId: string, userId: string): Promise<Expense | null> {
    const row = await db.query.expenses.findFirst({
      where: and(eq(expenses.tripId, tripId), eq(expenses.userId, userId), isNull(expenses.deletedAt)),
    });
    return row ? mapExpense(row) : null;
  },

  async listByVehicleAndRange(
    vehicleId: string,
    userId: string,
    from?: string,
    to?: string
  ): Promise<Expense[]> {
    const conditions = [eq(expenses.vehicleId, vehicleId), eq(expenses.userId, userId), isNull(expenses.deletedAt)];
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
      .where(and(eq(expenses.userId, userId), gte(expenses.date, from), lte(expenses.date, to), isNull(expenses.deletedAt)));
    return rows.map(mapExpense);
  },

  async avgKmplLast5(vehicleId: string): Promise<number | null> {
    const rows = await db
      .select({ kmpl: expenses.kmpl })
      .from(expenses)
      .where(and(eq(expenses.vehicleId, vehicleId), eq(expenses.reason, "Fuel"), isNotNull(expenses.kmpl), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.date))
      .limit(5);

    if (!rows.length) return null;
    const sum = rows.reduce((s, r) => s + Number(r.kmpl!), 0);
    return parseFloat((sum / rows.length).toFixed(2));
  },

  async lastFillUp(vehicleId: string): Promise<{ date: string; litresFilled: number } | null> {
    const row = await db.query.expenses.findFirst({
      where: and(eq(expenses.vehicleId, vehicleId), eq(expenses.reason, "Fuel"), isNotNull(expenses.litresFilled), isNull(expenses.deletedAt)),
      orderBy: desc(expenses.date),
    });

    if (!row?.litresFilled) return null;
    return { date: row.date, litresFilled: Number(row.litresFilled) };
  },
};
