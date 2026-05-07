import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { vehicleHistoryService } from "@/services/vehicleHistoryService";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const reg = req.nextUrl.searchParams.get("reg");
    if (!reg || reg.trim() === "") {
      return NextResponse.json({ error: "reg query parameter is required" }, { status: 400 });
    }

    const entries = await vehicleHistoryService.getByReg(reg);
    return NextResponse.json({ entries });
  } catch (error) {
    return handleApiError(error);
  }
}
