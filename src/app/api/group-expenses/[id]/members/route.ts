import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { groupExpenseService } from "@/services/groupExpenseService";
import { handleApiError } from "@/lib/errors";
import { z } from "zod";

const inviteSchema = z.object({
  userId: z.string().uuid(),
});

interface Props {
  params: { id: string };
}

export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { userId } = inviteSchema.parse(body);
    await groupExpenseService.inviteMember(params.id, session.user.id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
