import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { groupExpenseService } from "@/services/groupExpenseService";
import { handleApiError } from "@/lib/errors";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().max(120).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

interface Props {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await groupExpenseService.getById(params.id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);
    const result = await groupExpenseService.update(params.id, session.user.id, data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
