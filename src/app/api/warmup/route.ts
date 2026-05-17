import { db } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  await db.execute("SELECT 1");
  return NextResponse.json({ ok: true });
}
