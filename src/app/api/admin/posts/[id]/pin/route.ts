import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { handleApiError } from "@/lib/errors";
import { db } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { isPinned } = await req.json();
    await db
      .update(posts)
      .set({
        isPinned: !!isPinned,
        pinnedAt: isPinned ? new Date() : null,
      })
      .where(eq(posts.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
