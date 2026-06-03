import type { NextAuthConfig } from "next-auth";
import { assertProductionEnvReady } from "@/lib/env-validation";

assertProductionEnvReady();

const hasGoogleCredentials =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

export default {
  trustHost: true,
  providers: hasGoogleCredentials
    ? [
        {
          id: "google",
          name: "Google",
          type: "oidc",
          allowDangerousEmailAccountLinking: true,
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          issuer: "https://accounts.google.com",
          wellKnown: "https://accounts.google.com/.well-known/openid-configuration",
          authorization: {
            url: "https://accounts.google.com/o/oauth2/v2/auth",
            params: {
              scope: "openid email profile",
            },
          },
          token: "https://oauth2.googleapis.com/token",
          userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
          profile(profile) {
            return {
              id: profile.sub,
              name: profile.name,
              email: profile.email,
              image: profile.picture,
            };
          },
        },
      ]
    : [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

      if (isAdminRoute) {
        return isLoggedIn;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
