import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(1000),
  imageKeys: z.array(z.string()).max(2).optional().default([]),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
