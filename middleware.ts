import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import authConfig from "@/auth.config";
import { isE2ETestMode } from "@/lib/test-mode";

const { auth: authMiddleware } = NextAuth(authConfig);

export function middleware(request: NextRequest) {
  if (isE2ETestMode()) {
    return NextResponse.next();
  }

  return authMiddleware(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
