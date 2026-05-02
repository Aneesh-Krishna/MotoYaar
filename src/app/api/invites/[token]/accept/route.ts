import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { vehicleInviteService } from "@/services/vehicleInviteService";
import { handleApiError, ConflictError } from "@/lib/errors";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const result = await vehicleInviteService.acceptInvite(params.token, session.user.id);
    return NextResponse.json({ vehicleId: result.vehicleId });
  } catch (err) {
    if (err instanceof ConflictError && err.message.toLowerCase().includes("expired")) {
      return NextResponse.json({ error: { code: "EXPIRED" } }, { status: 410 });
    }
    return handleApiError(err);
  }
}
