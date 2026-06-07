import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import {
  adminRouteRateLimit,
  authRouteRateLimit,
  checkRateLimit,
  getRateLimitKey,
  loginRouteRateLimit,
} from "@/lib/rate-limit";
import { rateLimitedRouteHeaders } from "@/lib/security-headers";
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
  matcher: ["/admin/:path*", "/api/auth/:path*", "/login"],
};

function getRateLimitResponse(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ipAddress = getClientIp(request);
  const scope = getRateLimitScope(pathname);

  if (!scope) {
    return null;
  }

  const result = checkRateLimit(getRateLimitKey(scope, ipAddress), getRateLimitConfig(scope));

  if (result.allowed) {
    return null;
  }

  const response = new NextResponse("Too Many Requests", {
    status: 429,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(result.retryAfterSeconds),
    },
  });

  for (const header of rateLimitedRouteHeaders) {
    response.headers.set(header.key, header.value);
  }

  return response;
}

function getRateLimitScope(pathname: string) {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/api/auth")) {
    return "auth";
  }

  if (pathname === "/login") {
    return "login";
  }

  return null;
}

function getRateLimitConfig(scope: NonNullable<ReturnType<typeof getRateLimitScope>>) {
  if (scope === "admin") {
    return adminRouteRateLimit;
  }

  if (scope === "auth") {
    return authRouteRateLimit;
  }

  return loginRouteRateLimit;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
