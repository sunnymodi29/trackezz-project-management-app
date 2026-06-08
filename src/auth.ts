import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/db";
import { hasPendingInviteForEmail } from "@/lib/auth/invite-signup";
import { isGoogleAuthEnabled } from "@/lib/auth/google";
import { verifyPassword } from "@/lib/auth/password";
import { provisionOrganizationForUser } from "@/lib/organizations/setup";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // Credentials provider requires JWT sessions (Auth.js limitation)
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    ...(isGoogleAuthEnabled()
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email.toLowerCase() },
          });

          if (!user?.passwordHash) return null;

          const valid = await verifyPassword(
            parsed.data.password,
            user.passwordHash
          );
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? user.avatarUrl,
          };
        } catch (error) {
          console.error("[auth] Database error during login:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        if (user.email) token.email = user.email.toLowerCase();
        if (user.name) token.name = user.name;
        if (user.image) token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;

      const email = user.email.toLowerCase();
      await prisma.user.update({
        where: { id: user.id },
        data: { email },
      });

      const skipOrg = await hasPendingInviteForEmail(email);
      if (!skipOrg) {
        await provisionOrganizationForUser(
          user.id,
          user.name?.trim() || email.split("@")[0] || "User",
        );
      }
    },
  },
});
