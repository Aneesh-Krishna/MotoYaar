export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/garage/:path*",
    "/trips/:path*",
    "/profile/:path*",
    // Community excluded: accessible to guests
  ],
};
