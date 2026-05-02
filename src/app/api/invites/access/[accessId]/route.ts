import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { vehicleInviteService } from "@/services/vehicleInviteService";
import { notificationService } from "@/services/notificationService";
import { handleApiError } from "@/lib/errors";

export async function DELETE(_req: Request, { params }: { params: { accessId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

  try {
    const result = await vehicleInviteService.revokeAccess(params.accessId, session.user.id);
    notificationService.create({
      userId: result.revokedUserId,
      type: "access_revoked",
      message: `Your access to ${result.vehicleName} has been removed by the owner.`,
      actionUrl: "/garage",
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
