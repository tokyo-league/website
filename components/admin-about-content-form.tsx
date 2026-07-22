"use client";

import { useActionState, useEffect, useState } from "react";
import { updateAboutContent, type AboutContentActionState } from "@/app/admin/about/actions";
import type { AboutContent } from "@/lib/about-content";

const initialState: AboutContentActionState = { status: "idle", message: "" };

export function AdminAboutContentForm({ content }: { content: AboutContent }) {
  const [state, action, pending] = useActionState(updateAboutContent, initialState);
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
            <p className="section-kicker">About</p>
            <h3>公開ページの内容を編集</h3>
          </div>
        </div>
        <p className="admin-muted">保存すると、「東京リーグについて」ページに即時反映されます。</p>
        <form action={action} className="admin-form-stack">
          <fieldset className="admin-fieldset">
            <legend>組織概要</legend>
            <div className="admin-form-preview__grid admin-form-preview__grid--two">
              <label className="admin-field">
                <span>名称</span>
                <input type="text" name="name" defaultValue={content.overview.name} maxLength={100} required />
              </label>
              <label className="admin-field">
                <span>創立</span>
                <input type="text" name="founded" defaultValue={content.overview.founded} maxLength={200} required />
              </label>
              <label className="admin-field">
                <span>参加チーム</span>
                <input type="text" name="participatingTeams" defaultValue={content.overview.participatingTeams} maxLength={200} required />
              </label>
              <label className="admin-field">
                <span>総会/納会</span>
                <input
                  type="text"
                  name="generalMeetingReception"
                  defaultValue={content.overview.generalMeetingReception}
                  maxLength={200}
                  required
                />
              </label>
            </div>
          </fieldset>

          <label className="admin-field">
            <span>主な事業</span>
            <textarea name="mainActivities" defaultValue={content.mainActivities.join("\n")} rows={7} maxLength={4020} required />
            <small>1行につき1項目を入力してください。</small>
          </label>
          <label className="admin-field">
            <span>東京少年サッカー連盟の根本原則</span>
            <textarea name="fundamentalPrinciple" defaultValue={content.fundamentalPrinciple} rows={6} maxLength={1200} required />
          </label>
          <label className="admin-field">
            <span>努力目標</span>
            <textarea name="effortGoals" defaultValue={content.effortGoals.join("\n")} rows={7} maxLength={10020} required />
            <small>1行につき1項目を入力してください。</small>
          </label>
          <button type="submit" className="button" disabled={pending}>
            {pending ? "保存中..." : "変更を保存"}
          </button>
        </form>
      </article>
    </>
  );
}
