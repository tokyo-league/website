import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import {
  adminRouteRateLimit,
  checkRateLimit,
  getRateLimitKey,
  loginRouteRateLimit,
} from "@/lib/rate-limit";
import { isE2ETestMode } from "@/lib/test-mode";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const rateLimitResponse = getRateLimitResponse(request);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (isE2ETestMode()) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/login"],
};

function getRateLimitResponse(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ipAddress = getClientIp(request);
  const scope = pathname.startsWith("/admin") ? "admin" : pathname === "/login" ? "login" : null;

  if (!scope) {
    return null;
  }

  const result = checkRateLimit(
    getRateLimitKey(scope, ipAddress),
    scope === "admin" ? adminRouteRateLimit : loginRouteRateLimit,
  );

  if (result.allowed) {
    return null;
  }

  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(result.retryAfterSeconds),
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
