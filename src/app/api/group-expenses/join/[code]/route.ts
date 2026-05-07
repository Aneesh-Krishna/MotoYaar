import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { groupExpenseService } from "@/services/groupExpenseService";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { db } from "@/lib/db/client";
import { groupExpenseSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: { code: string };
}

export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const row = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.inviteCode, params.code),
      columns: { id: true, title: true, status: true, currency: true, inviteCode: true, createdAt: true },
    });
    if (!row) throw new NotFoundError("Invalid invite code");
    return NextResponse.json(row);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await groupExpenseService.joinByCode(params.code, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
