import { NextResponse } from "next/server";
import { liveSessionService } from "@/services/liveSessionService";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const count = await liveSessionService.expireOldSessions();
    return NextResponse.json({ expired: count });
  } catch (err) {
    console.error("[Cron Error] Failed to expire live sessions:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
