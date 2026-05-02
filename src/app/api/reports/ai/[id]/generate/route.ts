import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { aiReportService } from "@/services/aiReportService";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await aiReportService.runGeneration(params.id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
