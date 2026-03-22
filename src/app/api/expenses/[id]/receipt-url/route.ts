import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAccessUrl } from "@/lib/r2";
import { handleApiError } from "@/lib/errors";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, params.id),
    });

    if (!expense) throw new NotFoundError("Expense not found");
    if (expense.userId !== session.user.id) throw new ForbiddenError("Forbidden");
    if (!expense.receiptKey) {
      return NextResponse.json({ error: "No receipt attached" }, { status: 404 });
    }

    const signedUrl = await generateAccessUrl(expense.receiptKey, 900); // 15-min TTL
    return NextResponse.json({ signedUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
