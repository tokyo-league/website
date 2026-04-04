import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdminRole } from "@prisma/client";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return false;
      }

      const admin = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!admin) {
        return false;
      }

      if (user.name || user.image) {
        await prisma.user.update({
          where: { id: admin.id },
          data: {
            name: user.name ?? admin.name,
            image: user.image ?? admin.image,
          },
        });
      }

      user.role = admin.role;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;

        return token;
      }

      if (token.email && !token.role) {
        const admin = await prisma.user.findUnique({
          where: { email: token.email },
        });

        if (admin) {
          token.sub = admin.id;
          token.role = admin.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as AdminRole | undefined;
      }

      return session;
    },
  },
});
