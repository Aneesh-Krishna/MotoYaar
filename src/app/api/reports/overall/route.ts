import { getSession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { getCachedOverallReport } from "@/lib/cache";
import { NextResponse } from "next/server";
import type { OverallReportFilter } from "@/types";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const validTypes: OverallReportFilter["type"][] = ["monthly", "range", "yearly"];
    const rawType = searchParams.get("filter") ?? "monthly";
    const filterType: OverallReportFilter["type"] = validTypes.includes(rawType as OverallReportFilter["type"])
      ? (rawType as OverallReportFilter["type"])
      : "monthly";
    const filter: OverallReportFilter = {
      type: filterType,
      month1: searchParams.get("month1") ?? undefined,
      month2: searchParams.get("month2") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      compFrom: searchParams.get("compFrom") ?? undefined,
      compTo: searchParams.get("compTo") ?? undefined,
    };
    const report = await getCachedOverallReport(session.user.id, filter);
    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}
