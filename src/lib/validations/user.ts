import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  bio: z.string().max(300).optional(),
  profileImageUrl: z.string().url().optional().nullable(),
  instagramLink: z.string().url().optional().nullable(),
  walkthroughSeen: z.boolean().optional(),
  documentStoragePreference: z.enum(["parse_only", "full_storage"]).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
