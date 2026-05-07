import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { clubService } from "@/services/clubService";
import { handleApiError } from "@/lib/errors";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const members = await clubService.getMembers(params.id, session.user.id);
    return NextResponse.json(members);
  } catch (error) {
    return handleApiError(error);
  }
}
