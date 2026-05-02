import { getSession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { reportService } from "@/services/reportService";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") ?? "all";
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const report = await reportService.getVehicleReport(params.id, session.user.id, {
      filter,
      from,
      to,
    });
    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}
