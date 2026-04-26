import { getIronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";

declare module "iron-session" {
  interface IronSessionData {
    admin?: { id: string; email: string };
  }
}

const secret = process.env.ADMIN_SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("ADMIN_SESSION_SECRET must be set and at least 32 characters long");
}

const sessionOptions = {
  password: secret,
  cookieName: "motoyaar_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8,
  },
};

export async function getAdminSession() {
  return getIronSession<IronSessionData>(cookies(), sessionOptions);
}
