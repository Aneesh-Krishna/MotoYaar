import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: implement listByUser in Story 5.2
  return NextResponse.json([]);
}
