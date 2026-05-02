import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { communityService } from "@/services/communityService";
import { handleApiError } from "@/lib/errors";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await communityService.deleteComment(params.id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
