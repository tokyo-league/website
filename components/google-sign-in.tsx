"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function GoogleSignIn({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await signIn("google", { callbackUrl: "/admin" });
    setPending(false);
  }

  return (
    <button
      type="button"
      className="button"
      onClick={handleClick}
      disabled={!enabled || pending}
    >
      {enabled ? (pending ? "Googleでログイン中..." : "Googleでログイン") : "Google設定待ち"}
    </button>
  );
}
