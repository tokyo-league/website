import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/site-seo";

export default function robots(): MetadataRoute.Robots {
  const sitemap = getAbsoluteUrl("/sitemap.xml");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/admin/*", "/login", "/api/auth", "/api/auth/*", "/api/security", "/api/security/*"],
      },
    ],
    sitemap,
  };
}
