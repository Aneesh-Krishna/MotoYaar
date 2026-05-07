import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { clubService } from "@/services/clubService";
import { handleApiError } from "@/lib/errors";
import { updateClubSchema } from "@/lib/validations/club";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const club = await clubService.getById(params.id, session.user.id);
    return NextResponse.json(club);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateClubSchema.parse(body);
    const club = await clubService.update(params.id, session.user.id, data);
    return NextResponse.json(club);
  } catch (error) {
    return handleApiError(error);
  }
}
