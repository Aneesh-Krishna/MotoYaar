import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { notificationService } from "@/services/notificationService";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ count: 0 });
    }

    const count = await notificationService.countUnread(session.user.id);
    return NextResponse.json({ count });
  } catch (error) {
    return handleApiError(error);
  }
}
