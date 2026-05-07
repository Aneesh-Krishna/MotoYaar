import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { clubService } from "@/services/clubService";
import { handleApiError } from "@/lib/errors";
import { createClubSchema } from "@/lib/validations/club";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.slice(0, 100) || undefined;
    const result = await clubService.listForUser(session.user.id, search);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createClubSchema.parse(body);
    const club = await clubService.create(session.user.id, data);
    return NextResponse.json(club, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
