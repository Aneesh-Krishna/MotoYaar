import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (
      cookie.name.startsWith("next-auth") ||
      cookie.name.startsWith("__Secure-next-auth") ||
      cookie.name.startsWith("__Host-next-auth")
    ) {
      cookieStore.delete(cookie.name);
    }
  }
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}
