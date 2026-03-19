import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existingUser = await db.query.users.findFirst({
            where: eq(users.googleId, account.providerAccountId),
          });

          if (existingUser?.status === "banned") {
            return "/login?error=AccountBanned";
          }

          // F-M1: target googleId explicitly so username conflicts surface as real errors
          // F-M2: fallback if Google account has no display name
          await db
            .insert(users)
            .values({
              googleId: account.providerAccountId,
              name: user.name ?? user.email ?? "Unknown",
              username: null, // set during onboarding (Story 2.2)
            })
            .onConflictDoNothing({ target: users.googleId });
        } catch (error) {
          // F-H1: DB failure should deny sign-in rather than crash with unhandled error
          console.error("[auth] Failed to upsert user on sign-in:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      // Read from JWT token — avoids a DB hit on every session access.
      // The jwt callback below keeps these fields fresh (on sign-in and trigger="update").
      if (token.userId) session.user.id = token.userId as string;
      if (token.username !== undefined) session.user.username = token.username as string | null;
      if (token.walkthroughSeen !== undefined) session.user.walkthroughSeen = token.walkthroughSeen as boolean;
      return session;
    },
    async jwt({ token, account, trigger }) {
      if (account) token.sub = account.providerAccountId;

      if ((trigger === "update" || account) && token.sub) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.googleId, token.sub),
        });
        if (dbUser) {
          token.username = dbUser.username ?? undefined;
          token.userId = dbUser.id;
          token.walkthroughSeen = dbUser.walkthroughSeen;
        }
      }

      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
};
