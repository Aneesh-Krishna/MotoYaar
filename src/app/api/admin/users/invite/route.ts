import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/adminSession";
import { adminService } from "@/services/adminService";
import { handleApiError } from "@/lib/errors";

const inviteSchema = z.object({
  emails: z.array(z.string()).min(1).max(100),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { emails } = inviteSchema.parse(await req.json());
    const result = await adminService.bulkInviteUsers(emails, session.admin.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
