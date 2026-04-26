import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { adminService } from "@/services/adminService";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const analytics = await adminService.getAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
