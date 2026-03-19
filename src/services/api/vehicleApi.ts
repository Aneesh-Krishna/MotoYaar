import { apiRequest } from "@/lib/api-client";
import type { Vehicle } from "@/types";
import type { CreateVehicleInput, UpdateVehicleInput } from "@/lib/validations/vehicle";

export async function createVehicle(data: CreateVehicleInput): Promise<Vehicle> {
  return apiRequest<Vehicle>("/vehicles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listVehicles(): Promise<Vehicle[]> {
  return apiRequest<Vehicle[]>("/vehicles");
}

export async function updateVehicle(id: string, data: UpdateVehicleInput): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  return apiRequest<void>(`/vehicles/${id}`, {
    method: "DELETE",
  });
}
