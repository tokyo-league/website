import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdminRole } from "@prisma/client";
import authConfig from "@/auth.config";
import { applyAdminRecordToJwt, getAdminJwtLookupEmail } from "@/lib/admin-session";
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

      if (!admin || !admin.isActive) {
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

      user.id = admin.id;
      user.role = admin.role;

      return true;
    },
    async jwt({ token, user }) {
      const email = getAdminJwtLookupEmail(token, user);

      if (!email) {
        return null;
      }

      const admin = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      return applyAdminRecordToJwt(token, admin);
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
