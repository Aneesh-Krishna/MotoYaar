import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { groupExpenseService } from "@/services/groupExpenseService";
import { handleApiError } from "@/lib/errors";
import { createGroupExpenseItemSchema } from "@/lib/validations/group-expense";

interface Props {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const items = await groupExpenseService.listItems(params.id, session.user.id);
    return NextResponse.json(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createGroupExpenseItemSchema.parse(body);
    const item = await groupExpenseService.addItem(params.id, session.user.id, data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
