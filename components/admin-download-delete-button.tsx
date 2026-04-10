"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteDownload, type DownloadActionState } from "@/app/admin/downloads/actions";
import { ConfirmForm } from "@/components/confirm-form";

const initialDownloadActionState: DownloadActionState = {
  status: "idle",
  message: "",
};

export function AdminDownloadDeleteButton({ downloadId }: { downloadId: string }) {
  const [state, action, pending] = useActionState(deleteDownload, initialDownloadActionState);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (state.status !== "idle") {
      setMessage(state.message);
    }
  }, [state]);

  return (
    <div className="admin-inline-actions">
      <ConfirmForm action={action} message="この資料を削除します。よろしいですか？">
        <input type="hidden" name="downloadId" value={downloadId} />
        <button type="submit" className="button button--ghost" disabled={pending}>
          {pending ? "削除中..." : "削除"}
        </button>
      </ConfirmForm>
      {message ? <span className="admin-inline-message">{message}</span> : null}
    </div>
  );
}
