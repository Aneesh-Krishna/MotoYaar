import { z } from "zod";

export const createGroupExpenseItemSchema = z.object({
  paidBy: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1).max(100),
  category: z.enum(["Food", "Fuel", "Stay", "Toll", "Misc"]),
  includedUserIds: z.array(z.string().uuid()).min(1),
});

export const updateGroupExpenseItemSchema = z.object({
  paidBy: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).max(100).optional(),
  category: z.enum(["Food", "Fuel", "Stay", "Toll", "Misc"]).optional(),
  includedUserIds: z.array(z.string().uuid()).min(1).optional(),
});

export type CreateGroupExpenseItemInput = z.infer<typeof createGroupExpenseItemSchema>;
export type UpdateGroupExpenseItemInput = z.infer<typeof updateGroupExpenseItemSchema>;
