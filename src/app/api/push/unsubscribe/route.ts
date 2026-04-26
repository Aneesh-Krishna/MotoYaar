import { getSession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { pushService } from "@/services/pushService";
import { NextResponse } from "next/server";

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    await pushService.deleteAllForUser(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
