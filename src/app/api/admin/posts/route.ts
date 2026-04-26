import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { communityService } from "@/services/communityService";
import { userService } from "@/services/userService";
import { handleApiError } from "@/lib/errors";
import { createPostSchema } from "@/lib/validations/post";
import { db } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createPostSchema.parse(body);

    const adminUser = await userService.getByEmail("official@motoyaar.app");
    if (!adminUser) {
      return NextResponse.json({ error: "Admin system user not seeded" }, { status: 500 });
    }

    const post = await communityService.createPost(adminUser.id, data);

    if (body.isPinned) {
      await db
        .update(posts)
        .set({ isPinned: true, pinnedAt: new Date() })
        .where(eq(posts.id, post.id));
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
