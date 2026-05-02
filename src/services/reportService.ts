import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { OverallReport, OverallReportFilter, ReportFilter, VehicleReport } from "@/types";
import { vehicleService } from "@/services/vehicleService";
import { expenseService } from "@/services/expenseService";
import { convertAmount, hadCurrencyConversion } from "@/utils/currency";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatMonthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

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

export const reportService = {
  async getOverallReport(userId: string, filter: OverallReportFilter): Promise<OverallReport> {
    const userRow = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const currency = userRow?.currency ?? "INR";

    let primaryFrom: string;
    let primaryTo: string;
    let compFrom: string;
    let compTo: string;
    let label: string;

    if (filter.type === "monthly") {
      const m1 = filter.month1 ?? new Date().toISOString().slice(0, 7);
      const p = isoMonthBounds(m1);
      primaryFrom = p.from;
      primaryTo = p.to;

      if (filter.month2) {
        const c = isoMonthBounds(filter.month2);
        compFrom = c.from;
        compTo = c.to;
        label = `${formatMonthLabel(m1)} vs ${formatMonthLabel(filter.month2)}`;
      } else {
        const prev = prevMonthBounds(p.from);
        compFrom = prev.from;
        compTo = prev.to;
        const prevMonth = `${new Date(prev.from).getFullYear()}-${String(new Date(prev.from).getMonth() + 1).padStart(2, "0")}`;
        label = `${formatMonthLabel(m1)} vs ${formatMonthLabel(prevMonth)}`;
      }
    } else if (filter.type === "range" && filter.from && filter.to) {
      primaryFrom = filter.from;
      primaryTo = filter.to;
      if (filter.compFrom && filter.compTo) {
        compFrom = filter.compFrom;
        compTo = filter.compTo;
        label = `${filter.from} – ${filter.to} vs ${filter.compFrom} – ${filter.compTo}`;
      } else {
        const spanMs =
          new Date(filter.to).getTime() - new Date(filter.from).getTime();
        const compToDate = new Date(new Date(filter.from).getTime() - 1);
        const compFromDate = new Date(compToDate.getTime() - spanMs);
        compFrom = compFromDate.toISOString().split("T")[0];
        compTo = compToDate.toISOString().split("T")[0];
        label = `${filter.from} – ${filter.to} vs previous period`;
      }
    } else {
      const year = new Date().getFullYear();
      primaryFrom = `${year}-01-01`;
      primaryTo = `${year}-12-31`;
      compFrom = `${year - 1}-01-01`;
      compTo = `${year - 1}-12-31`;
      label = `${year} YTD vs ${year - 1}`;
    }

    const [primaryExpenses, compExpenses] = await Promise.all([
      expenseService.listByUserAndRange(userId, primaryFrom, primaryTo),
      expenseService.listByUserAndRange(userId, compFrom, compTo),
    ]);

    const totalSpend = primaryExpenses.reduce(
      (s, e) => s + convertAmount(e.price, e.currency, currency),
      0
    );
    const prevTotalSpend = compExpenses.reduce(
      (s, e) => s + convertAmount(e.price, e.currency, currency),
      0
    );

    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const e of primaryExpenses) {
      const amt = convertAmount(e.price, e.currency, currency);
      const entry = categoryMap.get(e.reason) ?? { amount: 0, count: 0 };
      entry.amount += amt;
      entry.count += 1;
      categoryMap.set(e.reason, entry);
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
    }));

    const vehicleMap = new Map<string, number>();
    for (const e of primaryExpenses) {
      if (!e.vehicleId) continue;
      vehicleMap.set(e.vehicleId, (vehicleMap.get(e.vehicleId) ?? 0) + convertAmount(e.price, e.currency, currency));
    }
    const perVehicle = Array.from(vehicleMap.entries()).map(([vehicleId, total]) => ({
      vehicleId,
      vehicleName: "",
      total,
    }));

    const primaryMonthMap = new Map<string, number>();
    const compMonthMap = new Map<string, number>();
    for (const e of primaryExpenses) {
      const key = e.date.slice(0, 7);
      primaryMonthMap.set(key, (primaryMonthMap.get(key) ?? 0) + convertAmount(e.price, e.currency, currency));
    }
    for (const e of compExpenses) {
      const key = e.date.slice(0, 7);
      compMonthMap.set(key, (compMonthMap.get(key) ?? 0) + convertAmount(e.price, e.currency, currency));
    }
    const allMonths = [...new Set([...primaryMonthMap.keys(), ...compMonthMap.keys()])].sort();
    const monthlyData = allMonths.map((m) => ({
      month: formatMonthLabel(m),
      primary: primaryMonthMap.get(m) ?? 0,
      comparison: compMonthMap.get(m) ?? 0,
    }));

    return {
      totalSpend,
      prevTotalSpend,
      currency,
      comparisonLabel: label,
      hadCurrencyConversion: hadCurrencyConversion(primaryExpenses, currency),
      perVehicle,
      byCategory,
      monthlyData,
    };
  },

  async getVehicleReport(
    vehicleId: string,
    userId: string,
    filter: ReportFilter
  ): Promise<VehicleReport> {
    const vehicle = await vehicleService.getWithAccessCheck(vehicleId, userId);

    const userRow = await db.query.users.findFirst({ where: eq(users.id, vehicle.userId) });
    const currency = userRow?.currency ?? "INR";

    // Resolve date ranges
    let from: string | undefined;
    let to: string | undefined;
    let prevFrom: string | undefined;
    let prevTo: string | undefined;

    if (filter.filter === "month") {
      const p = currentMonthBounds();
      from = p.from;
      to = p.to;
      const prev = prevMonthBounds(p.from);
      prevFrom = prev.from;
      prevTo = prev.to;
    } else if (filter.filter === "year") {
      const year = new Date().getFullYear();
      from = `${year}-01-01`;
      to = `${year}-12-31`;
    } else if (filter.filter === "custom" && filter.from && filter.to) {
      from = filter.from;
      to = filter.to;
    }

    const [primaryExpenses, prevExpenses] = await Promise.all([
      expenseService.listByVehicleAndRange(vehicleId, userId, from, to),
      expenseService.listByVehicleAndRange(vehicleId, userId, prevFrom, prevTo),
    ]);

    const totalSpend = primaryExpenses.reduce(
      (s, e) => s + convertAmount(e.price, e.currency, currency),
      0
    );
    const prevTotalSpend = prevExpenses.reduce(
      (s, e) => s + convertAmount(e.price, e.currency, currency),
      0
    );

    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const e of primaryExpenses) {
      const amt = convertAmount(e.price, e.currency, currency);
      const entry = categoryMap.get(e.reason) ?? { amount: 0, count: 0 };
      entry.amount += amt;
      entry.count += 1;
      categoryMap.set(e.reason, entry);
    }
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, { amount, count }]) => ({
        category,
        amount,
        count,
        percentage: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthMap = new Map<string, number>();
    for (const e of primaryExpenses) {
      const key = e.date.slice(0, 7);
      monthMap.set(key, (monthMap.get(key) ?? 0) + convertAmount(e.price, e.currency, currency));
    }
    const monthlyData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, amount]) => ({ month: formatMonthLabel(m), amount }));

    const uniqueMonths = new Set(primaryExpenses.map((e) => e.date.slice(0, 7)));
    const avgMonthlySpend = uniqueMonths.size > 0 ? totalSpend / uniqueMonths.size : 0;
    const mostExpensiveCategory =
      byCategory.length > 0 ? byCategory[0].category : null;

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
      hadCurrencyConversion: hadCurrencyConversion(primaryExpenses, currency),
    };
  },
};
