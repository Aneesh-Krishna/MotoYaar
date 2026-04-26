import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { adminService } from "@/services/adminService";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const posts = await adminService.getReportedPosts();
    return NextResponse.json(posts);
  } catch (error) {
    return handleApiError(error);
  }
}
