import { getSession } from "@/lib/session";
import { handleApiError, BadRequestError } from "@/lib/errors";
import { pushService } from "@/services/pushService";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body ?? {};

    if (!endpoint || typeof endpoint !== "string") {
      throw new BadRequestError("Missing or invalid endpoint");
    }
    if (!keys?.p256dh || !keys?.auth) {
      throw new BadRequestError("Missing keys.p256dh or keys.auth");
    }

    await pushService.subscribe(session.user.id, {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
