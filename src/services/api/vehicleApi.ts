import { apiRequest } from "@/lib/api-client";
import type { Vehicle } from "@/types";
import type { CreateVehicleInput } from "@/lib/validations/vehicle";

export async function createVehicle(data: CreateVehicleInput): Promise<Vehicle> {
  return apiRequest<Vehicle>("/vehicles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listVehicles(): Promise<Vehicle[]> {
  return apiRequest<Vehicle[]>("/vehicles");
}
