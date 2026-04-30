import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { liveSessionService } from "@/services/liveSessionService";
import { handleApiError } from "@/lib/errors";

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const participant = await liveSessionService.join(params.code, session.user.id);
    return NextResponse.json(participant, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
