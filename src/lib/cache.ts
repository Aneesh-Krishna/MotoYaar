import { unstable_cache } from "next/cache";
import { vehicleService } from "@/services/vehicleService";
import { expenseService } from "@/services/expenseService";
import { reportService } from "@/services/reportService";
import type { OverallReportFilter, ReportFilter } from "@/types";

export const CACHE_TAGS = {
  vehicles: (userId: string) => `vehicles-${userId}`,
  expenses: (userId: string) => `expenses-${userId}`,
  reports: (userId: string) => `reports-${userId}`,
};

export function getCachedVehicles(userId: string) {
  return unstable_cache(
    () => vehicleService.listByUser(userId),
    [`vehicles-list`, userId],
    { tags: [CACHE_TAGS.vehicles(userId)] }
  )();
}

export function getCachedRecentExpenses(userId: string, limit: number) {
  return unstable_cache(
    () => expenseService.recentByUser(userId, limit),
    [`expenses-recent`, userId, String(limit)],
    { tags: [CACHE_TAGS.expenses(userId)] }
  )();
}

export function getCachedOverallReport(userId: string, filter: OverallReportFilter) {
  const filterKey = JSON.stringify(filter);
  return unstable_cache(
    () => reportService.getOverallReport(userId, filter),
    [`report-overall`, userId, filterKey],
    { tags: [CACHE_TAGS.reports(userId)], revalidate: 300 }
  )();
}

export function getCachedVehicleReport(vehicleId: string, userId: string, filter: ReportFilter) {
  const filterKey = JSON.stringify(filter);
  return unstable_cache(
    () => reportService.getVehicleReport(vehicleId, userId, filter),
    [`report-vehicle`, vehicleId, userId, filterKey],
    { tags: [CACHE_TAGS.reports(userId)], revalidate: 300 }
  )();
}
