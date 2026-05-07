import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { groupExpenseService } from "@/services/groupExpenseService";
import { handleApiError } from "@/lib/errors";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().max(120).optional(),
  tripId: z.string().uuid().optional(),
  currency: z.string().min(1).max(10).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const result = await groupExpenseService.create(session.user.id, data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
