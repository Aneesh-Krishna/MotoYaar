import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { userService } from "@/services/userService";
import { handleApiError } from "@/lib/errors";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    await userService.deleteAccount(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
