import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { adminService } from "@/services/adminService";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").slice(0, 200);

  try {
    const results = await adminService.searchUsers(q);
    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}
