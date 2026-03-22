import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tokyo-league.jp",
      },
    ],
  },
};

export default nextConfig;
