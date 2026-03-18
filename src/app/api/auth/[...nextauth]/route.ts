// TODO: Implement in Story 2.1 — Authentication & Onboarding
// Full implementation: src/lib/auth.ts authOptions + this route handler
import NextAuth from "next-auth";

const handler = NextAuth({ providers: [] });
export { handler as GET, handler as POST };
