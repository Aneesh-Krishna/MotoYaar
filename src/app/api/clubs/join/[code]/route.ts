import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { clubService } from "@/services/clubService";
import { handleApiError } from "@/lib/errors";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const club = await clubService.resolveJoinLink(params.code);
    return NextResponse.json(club);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await clubService.joinViaCode(params.code, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
