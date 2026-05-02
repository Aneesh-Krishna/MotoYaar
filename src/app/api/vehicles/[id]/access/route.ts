import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { vehicleInviteService } from "@/services/vehicleInviteService";
import { handleApiError } from "@/lib/errors";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

  try {
    const [access, pendingInvites] = await Promise.all([
      vehicleInviteService.listAccess(params.id, session.user.id),
      vehicleInviteService.listPendingInvites(params.id, session.user.id),
    ]);
    return NextResponse.json({ access, pendingInvites });
  } catch (error) {
    return handleApiError(error);
  }
}
