import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("username");
    if (!username) return NextResponse.json({ available: false });

    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    return NextResponse.json({ available: !existing });
  } catch (error) {
    return handleApiError(error);
  }
}
