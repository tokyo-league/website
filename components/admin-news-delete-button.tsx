"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteNewsPost, type NewsActionState } from "@/app/admin/news/actions";

const initialNewsActionState: NewsActionState = {
  status: "idle",
  message: "",
};

export function AdminNewsDeleteButton({ newsId }: { newsId: string }) {
  const [state, action, pending] = useActionState(deleteNewsPost, initialNewsActionState);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (state.status !== "idle") {
      setMessage(state.message);
    }
  }, [state]);

  return (
    <div className="admin-inline-actions">
      <form action={action}>
        <input type="hidden" name="newsId" value={newsId} />
        <button type="submit" className="button button--ghost" disabled={pending}>
          {pending ? "削除中..." : "削除"}
        </button>
      </form>
      {message ? <span className="admin-inline-message">{message}</span> : null}
    </div>
  );
}
