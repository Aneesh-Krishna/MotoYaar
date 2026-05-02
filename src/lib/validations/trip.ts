import { z } from "zod";

const tripBreakdownItemSchema = z.object({
  category: z.enum(["Food", "Fuel", "Stay", "Toll", "Other"]),
  amount: z.coerce.number().min(0),
});

export const createTripSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  vehicleId: z.string().uuid().optional(),
  routeText: z.string().optional(),
  mapsLink: z
    .string()
    .url()
    .refine((val) => /^https?:\/\//.test(val), {
      message: "Maps link must be an http or https URL",
    })
    .optional()
    .or(z.literal("")),
  timeTaken: z.string().optional(),
  breakdown: z.array(tripBreakdownItemSchema),
  createGeneralExpense: z.boolean().optional(),
});

export const updateTripSchema = createTripSchema.partial().extend({
  // Allow null to explicitly remove a vehicle (undefined = "not changed", null = "remove")
  vehicleId: z.string().uuid().nullable().optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
