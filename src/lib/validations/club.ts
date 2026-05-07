import { z } from "zod";

export const createClubSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  description: z.string().max(300).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  joinPolicy: z.enum(["approval", "open"]).default("approval"),
});

export const updateClubSchema = createClubSchema.partial();

export const memberActionSchema = z.object({
  action: z.enum(["approve", "reject", "remove", "promote"]),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type MemberActionInput = z.infer<typeof memberActionSchema>;
