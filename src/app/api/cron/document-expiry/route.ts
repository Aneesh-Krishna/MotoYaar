import { NextRequest, NextResponse } from "next/server";

// TODO: Implement full cron logic in Story 8.1
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    message: "Cron stub — not yet implemented",
    processed: 0,
    notified: 0,
    deleted: 0,
  });
}
