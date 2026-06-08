import type { NextConfig } from "next";
import { privateRouteHeaders, securityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tokyo-league.jp",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/admin/:path*",
        headers: privateRouteHeaders,
      },
      {
        source: "/login",
        headers: privateRouteHeaders,
      },
      {
        source: "/api/auth/:path*",
        headers: privateRouteHeaders,
      },
      {
        source: "/api/security/:path*",
        headers: privateRouteHeaders,
      },
    ];
  },
};

export default nextConfig;
