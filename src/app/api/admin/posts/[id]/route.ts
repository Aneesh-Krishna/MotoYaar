import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { adminService } from "@/services/adminService";
import { handleApiError } from "@/lib/errors";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action } = body as { action: string };
  if (action !== "restore" && action !== "remove") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    if (action === "restore") {
      await adminService.restorePost(params.id, session.admin.id);
    } else {
      await adminService.removePost(params.id, session.admin.id);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
