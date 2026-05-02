import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { expenseService } from "@/services/expenseService";
import { handleApiError } from "@/lib/errors";
import { updateExpenseSchema } from "@/lib/validations/expense";
import { CACHE_TAGS } from "@/lib/cache";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateExpenseSchema.parse(body);
    const expense = await expenseService.update(params.id, session.user.id, data);
    revalidateTag(CACHE_TAGS.expenses(session.user.id));
    revalidateTag(CACHE_TAGS.vehicles(session.user.id));
    revalidateTag(CACHE_TAGS.reports(session.user.id));
    return NextResponse.json(expense);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await expenseService.delete(params.id, session.user.id);
    revalidateTag(CACHE_TAGS.expenses(session.user.id));
    revalidateTag(CACHE_TAGS.vehicles(session.user.id));
    revalidateTag(CACHE_TAGS.reports(session.user.id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
