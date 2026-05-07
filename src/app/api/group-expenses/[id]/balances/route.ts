import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { groupExpenseService } from "@/services/groupExpenseService";
import { handleApiError } from "@/lib/errors";

interface Props {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await groupExpenseService.computeBalances(params.id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
