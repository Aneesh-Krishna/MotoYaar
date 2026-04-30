import { apiRequest } from "@/lib/api-client";

export async function deleteTrip(tripId: string): Promise<void> {
  await apiRequest(`/trips/${tripId}`, {
    method: "DELETE",
  });
}
