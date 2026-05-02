import { z } from "zod";

const baseExpenseFields = {
  price: z.number({ invalid_type_error: "Price must be greater than 0" }).positive("Price must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  reason: z.enum(["Service", "Fuel", "Trip", "Others"]),
  whereText: z.string().optional(),
  comment: z.enum(["Overpriced", "Average", "Underpriced"]).optional(),
};

export const createExpenseSchema = z.object({
  ...baseExpenseFields,
  tempReceiptKey: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  ...baseExpenseFields,
  tempReceiptKey: z.string().optional(),
  removeReceipt: z.boolean().optional(),
}).partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
