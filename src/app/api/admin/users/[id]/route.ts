import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { adminService } from "@/services/adminService";
import { handleApiError } from "@/lib/errors";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await adminService.getUser(params.id);
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action, suspendDays, googleId } = body as {
    action: string;
    suspendDays?: number;
    googleId?: string;
  };

  const validActions = ["warn", "suspend", "ban", "lift", "unban", "relink"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "suspend" && (typeof suspendDays !== "number" || suspendDays < 1)) {
    return NextResponse.json({ error: "suspendDays must be a positive number" }, { status: 400 });
  }

  if (action === "relink" && !googleId) {
    return NextResponse.json({ error: "googleId required for relink" }, { status: 400 });
  }

  try {
    await adminService.updateUserStatus(
      params.id,
      action as "warn" | "suspend" | "ban" | "lift" | "unban" | "relink",
      { suspendDays, googleId, adminId: session.admin.id }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
