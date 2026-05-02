import { unstable_cache } from "next/cache";
import { vehicleService } from "@/services/vehicleService";
import { expenseService } from "@/services/expenseService";

export const CACHE_TAGS = {
  vehicles: (userId: string) => `vehicles-${userId}`,
  expenses: (userId: string) => `expenses-${userId}`,
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
