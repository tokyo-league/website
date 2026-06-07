import type { AdminRole } from "@prisma/client";
import type { User } from "next-auth";
import type { JWT } from "next-auth/jwt";

export type AdminJwtRecord = {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
};

export function getAdminJwtLookupEmail(token: JWT, user?: User) {
  return user?.email ?? token.email ?? null;
}

export function applyAdminRecordToJwt(token: JWT, admin: AdminJwtRecord | null | undefined) {
  if (!admin?.isActive) {
    return null;
  }

  return {
    ...token,
    sub: admin.id,
    email: admin.email,
    role: admin.role,
  };
}
