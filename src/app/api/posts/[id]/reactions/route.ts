import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { communityService } from "@/services/communityService";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type } = await req.json();
    if (type !== "like" && type !== "dislike") {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }
    const result = await communityService.addReaction(params.id, session.user.id, type);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
