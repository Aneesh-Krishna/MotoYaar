import { apiRequest } from "@/lib/api-client";
import type { Trip } from "@/types";
import type { CreateTripInput, UpdateTripInput } from "@/lib/validations/trip";

export async function createTrip(data: CreateTripInput): Promise<Trip> {
  return apiRequest<Trip>("/trips", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTrip(tripId: string, data: UpdateTripInput): Promise<Trip> {
  return apiRequest<Trip>(`/trips/${tripId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTrip(tripId: string): Promise<void> {
  await apiRequest(`/trips/${tripId}`, {
    method: "DELETE",
  });
}
