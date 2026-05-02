import { getIronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";

declare module "iron-session" {
  interface IronSessionData {
    admin?: { id: string; email: string };
  }
}

// Placeholder used only at build time so static analysis succeeds.
// Requests without a real secret will have no session.admin set.
const PLACEHOLDER = "build-time-placeholder-at-least-32-chars!!";

export async function getAdminSession() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? PLACEHOLDER;
  return getIronSession<IronSessionData>(cookies(), {
    password: secret,
    cookieName: "motoyaar_admin_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 8,
    },
  });
}
