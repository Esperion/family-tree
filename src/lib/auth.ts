import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";

/**
 * Auth.js (NextAuth v5).
 *
 * Sessions are JWT rather than database-backed: the Credentials provider used
 * for local dev sign-in requires it, and roles are cheap to resolve per request
 * anyway (see `authorize()` in Phase 3), so nothing rides on the session beyond
 * the user id.
 */

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

/** Dev sign-in is compiled out of production builds entirely. */
const devLoginEnabled = process.env.NODE_ENV !== "production";

const providers: NextAuthConfig["providers"] = [];

if (googleConfigured) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // A person may dev-sign-in, then later use Google with the same address.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev sign-in",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(raw) {
        const email = String(raw?.email ?? "")
          .trim()
          .toLowerCase();
        if (!email.includes("@")) return null;

        const user = await prisma.user.upsert({
          where: { email },
          create: { email, name: email.split("@")[0] },
          update: {},
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/signin" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

export { googleConfigured, devLoginEnabled };
