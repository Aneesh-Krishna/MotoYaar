import { db } from "@/lib/db/client";
import { expenses, vehicles, users, vehicleAccess } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { OverallReport, OverallReportFilter, ReportFilter, VehicleReport } from "@/types";

function isoMonthBounds(month: string): { from: string; to: string } {
  const [year, mon] = month.split("-").map(Number);
  const from = `${year}-${String(mon).padStart(2, "0")}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const to = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function currentMonthBounds(): { from: string; to: string } {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return isoMonthBounds(month);
}

function prevMonthBounds(from: string): { from: string; to: string } {
  const date = new Date(from);
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  const m = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return isoMonthBounds(m);
}

async function fetchExpensesInRange(userId: string, from: string, to: string) {
  return db
    .select({ expense: expenses, vehicleName: vehicles.name })
    .from(expenses)
    .leftJoin(vehicles, eq(expenses.vehicleId, vehicles.id))
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, from),
        lte(expenses.date, to)
      )
    );
}

function buildReport(
  primaryRows: Awaited<ReturnType<typeof fetchExpensesInRange>>,
  compRows: Awaited<ReturnType<typeof fetchExpensesInRange>>,
  currency: string,
  comparisonLabel: string
): OverallReport {
  const totalSpend = primaryRows.reduce((s, r) => s + parseFloat(String(r.expense.price)), 0);
  const prevTotalSpend = compRows.reduce((s, r) => s + parseFloat(String(r.expense.price)), 0);

  const categoryMap = new Map<string, { amount: number; count: number }>();
  for (const { expense } of primaryRows) {
    const cat = expense.reason;
    const entry = categoryMap.get(cat) ?? { amount: 0, count: 0 };
    entry.amount += parseFloat(String(expense.price));
    entry.count += 1;
    categoryMap.set(cat, entry);
  }
  const byCategory = Array.from(categoryMap.entries()).map(([category, { amount, count }]) => ({
    category,
    amount,
    count,
    percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
  }));

  const vehicleMap = new Map<string, { vehicleName: string; total: number }>();
  for (const { expense, vehicleName } of primaryRows) {
    if (!expense.vehicleId) continue;
    const entry = vehicleMap.get(expense.vehicleId) ?? { vehicleName: vehicleName ?? "Unknown", total: 0 };
    entry.total += parseFloat(String(expense.price));
    vehicleMap.set(expense.vehicleId, entry);
  }
  const perVehicle = Array.from(vehicleMap.entries()).map(([vehicleId, { vehicleName, total }]) => ({
    vehicleId,
    vehicleName,
    total,
  }));

  // Group by month for chart
  const primaryMonthMap = new Map<string, number>();
  const compMonthMap = new Map<string, number>();
  for (const { expense } of primaryRows) {
    const month = expense.date.slice(0, 7);
    primaryMonthMap.set(month, (primaryMonthMap.get(month) ?? 0) + parseFloat(String(expense.price)));
  }
  for (const { expense } of compRows) {
    const month = expense.date.slice(0, 7);
    compMonthMap.set(month, (compMonthMap.get(month) ?? 0) + parseFloat(String(expense.price)));
  }
  const allMonths = [...new Set([...primaryMonthMap.keys(), ...compMonthMap.keys()])].sort();
  const monthlyData = allMonths.map((month) => ({
    month,
    primary: primaryMonthMap.get(month) ?? 0,
    comparison: compMonthMap.get(month) ?? 0,
  }));

  return {
    totalSpend,
    prevTotalSpend,
    currency,
    comparisonLabel,
    hadCurrencyConversion: false,
    perVehicle,
    byCategory,
    monthlyData,
  };
}

export const reportService = {
  async getOverallReport(userId: string, filter: OverallReportFilter): Promise<OverallReport> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const currency = user?.currency ?? "INR";

    let primaryFrom: string;
    let primaryTo: string;
    let compFrom: string;
    let compTo: string;
    let label: string;

    if (filter.type === "monthly") {
      const m1 = filter.month1 ?? new Date().toISOString().slice(0, 7);
      const m2 = filter.month2;
      const p = isoMonthBounds(m1);
      primaryFrom = p.from;
      primaryTo = p.to;
      if (m2) {
        const c = isoMonthBounds(m2);
        compFrom = c.from;
        compTo = c.to;
        label = `${m1} vs ${m2}`;
      } else {
        const prev = prevMonthBounds(p.from);
        compFrom = prev.from;
        compTo = prev.to;
        label = `${m1} vs previous month`;
      }
    } else if (filter.type === "range" && filter.from && filter.to) {
      primaryFrom = filter.from;
      primaryTo = filter.to;
      if (filter.compFrom && filter.compTo) {
        compFrom = filter.compFrom;
        compTo = filter.compTo;
        label = `${filter.from} – ${filter.to} vs ${filter.compFrom} – ${filter.compTo}`;
      } else {
        const spanMs = new Date(filter.to).getTime() - new Date(filter.from).getTime();
        const compToDate = new Date(new Date(filter.from).getTime() - 1);
        const compFromDate = new Date(compToDate.getTime() - spanMs);
        compFrom = compFromDate.toISOString().split("T")[0];
        compTo = compToDate.toISOString().split("T")[0];
        label = `${filter.from} – ${filter.to} vs previous period`;
      }
    } else {
      // yearly
      const year = new Date().getFullYear();
      primaryFrom = `${year}-01-01`;
      primaryTo = `${year}-12-31`;
      compFrom = `${year - 1}-01-01`;
      compTo = `${year - 1}-12-31`;
      label = `${year} vs ${year - 1}`;
    }

    const [primaryRows, compRows] = await Promise.all([
      fetchExpensesInRange(userId, primaryFrom, primaryTo),
      fetchExpensesInRange(userId, compFrom, compTo),
    ]);

    return buildReport(primaryRows, compRows, currency, label);
  },

  async getVehicleReport(vehicleId: string, userId: string, filter: ReportFilter): Promise<VehicleReport> {
    const vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleId) });
    if (!vehicle) throw new NotFoundError("Vehicle not found");

    if (vehicle.userId !== userId) {
      const access = await db.query.vehicleAccess.findFirst({
        where: and(eq(vehicleAccess.vehicleId, vehicleId), eq(vehicleAccess.userId, userId)),
      });
      if (!access) throw new ForbiddenError("You do not have access to this vehicle");
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, vehicle.userId) });
    const currency = user?.currency ?? "INR";

    const conditions = [eq(expenses.vehicleId, vehicleId)];
    if (filter.from) conditions.push(gte(expenses.date, filter.from));
    if (filter.to) conditions.push(lte(expenses.date, filter.to));

    const [primaryRows, prevRows] = await Promise.all([
      db.select().from(expenses).where(and(...conditions)),
      // Comparison: same span length immediately before the primary range
      filter.from && filter.to
        ? (() => {
            const spanMs = new Date(filter.to!).getTime() - new Date(filter.from!).getTime();
            const prevTo = new Date(new Date(filter.from!).getTime() - 1);
            const prevFrom = new Date(prevTo.getTime() - spanMs);
            return db.select().from(expenses).where(
              and(
                eq(expenses.vehicleId, vehicleId),
                gte(expenses.date, prevFrom.toISOString().split("T")[0]),
                lte(expenses.date, prevTo.toISOString().split("T")[0])
              )
            );
          })()
        : Promise.resolve([]),
    ]);

    const totalSpend = primaryRows.reduce((s, r) => s + parseFloat(String(r.price)), 0);
    const prevTotalSpend = prevRows.reduce((s, r) => s + parseFloat(String(r.price)), 0);

    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const r of primaryRows) {
      const entry = categoryMap.get(r.reason) ?? { amount: 0, count: 0 };
      entry.amount += parseFloat(String(r.price));
      entry.count += 1;
      categoryMap.set(r.reason, entry);
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
    }));

    const monthMap = new Map<string, number>();
    for (const r of primaryRows) {
      const month = r.date.slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + parseFloat(String(r.price)));
    }
    const monthlyData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));

    const uniqueMonths = new Set(primaryRows.map((r) => r.date.slice(0, 7)));
    const avgMonthlySpend = uniqueMonths.size > 0 ? totalSpend / uniqueMonths.size : 0;
    const mostExpensiveCategory =
      byCategory.length > 0
        ? byCategory.reduce((a, b) => (a.amount >= b.amount ? a : b)).category
        : null;

    return {
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        registrationNumber: vehicle.registrationNumber,
      },
      totalSpend,
      prevTotalSpend,
      currency,
      byCategory,
      monthlyData,
      avgMonthlySpend,
      mostExpensiveCategory,
      hadCurrencyConversion: false,
    };
  },
};
