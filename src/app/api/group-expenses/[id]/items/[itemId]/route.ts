import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { groupExpenseService } from "@/services/groupExpenseService";
import { handleApiError } from "@/lib/errors";
import { updateGroupExpenseItemSchema } from "@/lib/validations/group-expense";

interface Props {
  params: { id: string; itemId: string };
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateGroupExpenseItemSchema.parse(body);
    const item = await groupExpenseService.updateItem(params.id, params.itemId, session.user.id, data);
    return NextResponse.json(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await groupExpenseService.deleteItem(params.id, params.itemId, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
