import { AdminRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: AdminRole;
    };
  }

  interface User {
    role?: AdminRole;
  }
}
