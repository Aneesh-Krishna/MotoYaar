import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { notificationService } from "@/services/notificationService";
import { handleApiError } from "@/lib/errors";

export async function PATCH() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    await notificationService.markAllRead(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
