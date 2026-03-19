import { z } from "zod";

export const createDocumentSchema = z.object({
  type: z.enum(["RC", "Insurance", "PUC", "DL", "Other"]),
  label: z.string().optional(),
  expiryDate: z.string().optional(), // ISO date string YYYY-MM-DD
  parseStatus: z.enum(["parsed", "manual", "incomplete"]),
  tempR2Key: z.string().optional(), // key from parse step
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  type: z.enum(["RC", "Insurance", "PUC", "DL", "Other"]).optional(),
  label: z.string().optional(),
  expiryDate: z.string().optional().nullable(), // null = remove expiry date
  tempR2Key: z.string().optional(), // if file was replaced
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
