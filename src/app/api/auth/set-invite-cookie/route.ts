import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token } = await req.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("pending_invite_token", token, {
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
