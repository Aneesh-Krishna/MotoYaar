import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { clubService } from "@/services/clubService";
import { handleApiError } from "@/lib/errors";
import { memberActionSchema } from "@/lib/validations/club";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = memberActionSchema.parse(body);
    await clubService.memberAction(params.id, session.user.id, params.userId, action);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
