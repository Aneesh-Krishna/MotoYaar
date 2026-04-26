import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { communityService } from "@/services/communityService";
import { handleApiError } from "@/lib/errors";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const comments = await communityService.getComments(params.id);
    return NextResponse.json(comments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content, parentCommentId } = await req.json();
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    const comment = await communityService.addComment(
      params.id,
      session.user.id,
      content.trim(),
      parentCommentId
    );
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
