import type { RecentActivity } from "@/types";

export const expenseService = {
  /**
   * Returns the most recent expense entries across all of a user's vehicles,
   * joined with vehicle name.
   *
   * Stub: returns [] until Epic 05 implements expense tracking.
   * Full implementation will: JOIN vehicles ON expenses.vehicle_id = vehicles.id,
   * ORDER BY expenses.date DESC, LIMIT limit.
   */
  async recentByUser(_userId: string, _limit: number): Promise<RecentActivity[]> {
    return [];
  },
};
