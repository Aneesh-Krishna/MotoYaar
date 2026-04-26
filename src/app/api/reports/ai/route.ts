import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { aiReportService } from "@/services/aiReportService";
import type { ExpenseSnapshot } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const reports = await aiReportService.listByUser(session.user.id);
    return NextResponse.json(reports);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as { periodLabel: string; expenseSnapshot: ExpenseSnapshot };
    const { reportId } = await aiReportService.requestReport(
      session.user.id,
      body.periodLabel,
      body.expenseSnapshot
    );
    return NextResponse.json({ reportId });
  } catch (error) {
    return handleApiError(error);
  }
}
