import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/admin/*", "/login", "/api/auth", "/api/auth/*", "/api/security", "/api/security/*"],
      },
    ],
  };
}
