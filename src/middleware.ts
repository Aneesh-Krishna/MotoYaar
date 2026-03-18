import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // New user without username → redirect to onboarding
    // Exempt all /onboarding/* routes (covers /onboarding and /onboarding/walkthrough)
    if (token && !token.username && !pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protect all routes EXCEPT:
     * - /login (auth page)
     * - /community and /community/* (guest read access)
     * - /onboarding/walkthrough (public walkthrough preview — AC1)
     * - /api/auth/* (NextAuth routes)
     * - /_next/* (Next.js internals)
     * - /icons/*, /manifest.json (PWA static files)
     */
    "/((?!login|community|onboarding/walkthrough|api/auth|_next|icons|manifest\\.json|favicon\\.ico).*)",
  ],
};
