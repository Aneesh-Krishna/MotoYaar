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
              username: "", // set during onboarding (Story 2.2)
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
      if (token.sub) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.googleId, token.sub),
        });
        // F-H2: guard against missing DB record (e.g. insert failed silently)
        if (!dbUser) {
          console.warn("[auth] Session user not found in DB for googleId:", token.sub);
          return session;
        }
        session.user.id = dbUser.id;
        session.user.username = dbUser.username;
        session.user.walkthroughSeen = dbUser.walkthroughSeen;
      }
      return session;
    },
    async jwt({ token, account, trigger }) {
      if (account) token.sub = account.providerAccountId;

      if ((trigger === "update" || account) && token.sub) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.googleId, token.sub),
        });
        if (dbUser) {
          token.username = dbUser.username;
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
