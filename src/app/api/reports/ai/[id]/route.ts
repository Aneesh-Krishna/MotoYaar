import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { aiReportService } from "@/services/aiReportService";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const report = await aiReportService.getById(params.id, session.user.id);
    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}
