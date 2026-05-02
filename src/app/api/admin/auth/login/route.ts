import { NextResponse } from "next/server";
import { adminService } from "@/services/adminService";
import { getAdminSession } from "@/lib/adminSession";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || !email || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  try {
    const admin = await adminService.login(email, password);
    const session = await getAdminSession();
    session.admin = { id: admin.id, email: admin.email };
    await session.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid credentials") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    console.error("[admin/login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
