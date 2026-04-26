import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { communityService } from "@/services/communityService";
import { handleApiError } from "@/lib/errors";

const reportSchema = z.object({
  reason: z.enum(["spam", "inappropriate", "misinformation", "harassment", "other"]),
  description: z.string().min(1).max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { reason, description } = reportSchema.parse(body);

    await communityService.reportPost(params.id, session.user.id, reason, description);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
