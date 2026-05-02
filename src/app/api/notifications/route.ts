import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { notificationService } from "@/services/notificationService";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    const result = await notificationService.listByUser(session.user.id, page);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
