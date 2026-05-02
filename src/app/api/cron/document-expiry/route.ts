import { NextResponse } from "next/server";
import { cronService } from "@/services/cronService";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cronService.runDocumentExpiryCheck();
  return NextResponse.json(result);
}
