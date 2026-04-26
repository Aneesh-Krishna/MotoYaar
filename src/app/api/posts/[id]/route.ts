import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { communityService } from "@/services/communityService";
import { handleApiError } from "@/lib/errors";
import { createPostSchema } from "@/lib/validations/post";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await communityService.deletePost(params.id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createPostSchema.parse(body);
    const post = await communityService.updatePost(params.id, session.user.id, data);
    return NextResponse.json(post);
  } catch (error) {
    return handleApiError(error);
  }
}
