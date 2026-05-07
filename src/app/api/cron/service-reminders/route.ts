import { NextResponse } from "next/server";
import { serviceReminderService } from "@/services/serviceReminderService";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await serviceReminderService.runDateReminderCheck();
  return NextResponse.json(result);
}
