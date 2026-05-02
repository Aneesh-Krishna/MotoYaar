import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { vehicleInviteService } from "@/services/vehicleInviteService";
import { handleApiError } from "@/lib/errors";

export async function DELETE(_req: Request, { params }: { params: { token: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

  try {
    // params.token is the invite's UUID id (not the invite token string) — folder named [token] to
    // coexist with the [token]/accept sub-route without creating a dynamic segment conflict.
    await vehicleInviteService.cancelInvite(params.token, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
