import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }

      return session;
    },
  },
});
