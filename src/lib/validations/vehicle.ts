import { z } from "zod";

export const createVehicleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["2-wheeler", "4-wheeler", "truck", "other"]),
  company: z.string().optional(),
  model: z.string().optional(),
  variant: z.string().optional(),
  color: z.string().optional(),
  registrationNumber: z.string().min(1, "Registration number is required"),
  purchasedAt: z.string().optional(), // ISO date string YYYY-MM-DD
  previousOwners: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional(),
  imageKey: z.string().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  registrationNumber: z.string().min(1).optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
