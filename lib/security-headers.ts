export type HttpHeader = {
  key: string;
  value: string;
};

const isDevelopment = process.env.NODE_ENV === "development";

export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tokyo-league.jp https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://openidconnect.googleapis.com https://challenges.cloudflare.com https://*.public.blob.vercel-storage.com",
  "frame-src 'self' https://accounts.google.com https://challenges.cloudflare.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "report-uri /api/security/csp-report",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

export const securityHeaders: HttpHeader[] = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

export const privateRouteHeaders: HttpHeader[] = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate",
  },
];

export const rateLimitedRouteHeaders: HttpHeader[] = [
  ...securityHeaders,
  ...privateRouteHeaders,
];
