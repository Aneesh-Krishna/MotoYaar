import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { expenseService } from "@/services/expenseService";
import { handleApiError } from "@/lib/errors";
import { createExpenseSchema } from "@/lib/validations/expense";
import { CACHE_TAGS } from "@/lib/cache";

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: implement listByUser in Story 5.2
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createExpenseSchema.parse(body);
    const expense = await expenseService.create(session.user.id, undefined, data);
    revalidateTag(CACHE_TAGS.expenses(session.user.id));
    revalidateTag(CACHE_TAGS.vehicles(session.user.id));
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
