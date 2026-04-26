import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { aiReportService } from "@/services/aiReportService";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const quota = await aiReportService.checkQuota(session.user.id);
    return NextResponse.json(quota);
  } catch (error) {
    return handleApiError(error);
  }
}
