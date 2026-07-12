"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateHomeMessages,
  type HomeMessagesActionState,
} from "@/app/admin/home-messages/actions";
import type { HomeMessages } from "@/lib/home-messages";

const initialState: HomeMessagesActionState = { status: "idle", message: "" };

export function AdminHomeMessagesForm({ messages }: { messages: HomeMessages }) {
  const [state, action, pending] = useActionState(updateHomeMessages, initialState);
  const [toast, setToast] = useState(initialState);

  useEffect(() => {
    if (state.status !== "idle") setToast(state);
  }, [state]);

  return (
    <>
      {toast.status !== "idle" ? (
        <div className={`admin-toast admin-toast--${toast.status}`} role="status" aria-live="polite">
          <p>{toast.message}</p>
          <button type="button" className="button button--ghost" onClick={() => setToast(initialState)}>
            閉じる
          </button>
        </div>
      ) : null}

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Home Messages</p>
            <h3>トップページの文言を編集</h3>
          </div>
        </div>
        <p className="admin-muted">
          保存すると、トップページに即時反映されます。メインメッセージはサイト共通フッターにも同じ内容で表示されます。
        </p>
        <form action={action} className="admin-form-stack">
          <label className="admin-field">
            <span>メインメッセージ（トップ・フッター共通）</span>
            <input type="text" name="mainMessage" defaultValue={messages.mainMessage} maxLength={100} required />
          </label>
          <label className="admin-field">
            <span>メインメッセージ（紹介見出し）</span>
            <input type="text" name="leadMessage" defaultValue={messages.leadMessage} maxLength={140} required />
          </label>
          <label className="admin-field">
            <span>サブメッセージ</span>
            <textarea name="subMessage" defaultValue={messages.subMessage} rows={4} maxLength={400} required />
          </label>
          <button type="submit" className="button" disabled={pending}>
            {pending ? "保存中..." : "変更を保存"}
          </button>
        </form>
      </article>
    </>
  );
}
