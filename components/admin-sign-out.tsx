"use client";

import { signOut } from "next-auth/react";

export function AdminSignOut() {
  return (
    <button
      type="button"
      className="button button--ghost"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      ログアウト
    </button>
  );
}
