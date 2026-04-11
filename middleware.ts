import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import { isE2ETestMode } from "@/lib/test-mode";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  if (isE2ETestMode()) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
