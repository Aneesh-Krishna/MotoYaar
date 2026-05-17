import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { communityService } from "@/services/communityService";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type } = body;
    if (type !== "up" && type !== "down") {
      return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
    }
    const result = await communityService.voteComment(params.id, session.user.id, type);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
