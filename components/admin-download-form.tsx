"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { DownloadCategory, PublishStatus } from "@prisma/client";
import { createDownload, type DownloadActionState } from "@/app/admin/downloads/actions";

const initialState: DownloadActionState = {
  status: "idle",
  message: "",
};

export function AdminDownloadForm() {
  const [state, formAction, pending] = useActionState(createDownload, initialState);
  const [toast, setToast] = useState(initialState);
  const inputId = useId();
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (state.status !== "idle") {
      setToast(state);
    }
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
            <p className="section-kicker">Create</p>
            <h3>資料を追加</h3>
          </div>
        </div>
        <form action={formAction} className="admin-form-stack" encType="multipart/form-data">
          <label className="admin-field">
            <span>タイトル</span>
            <input type="text" name="title" required />
          </label>
          <label className="admin-field">
            <span>カテゴリ</span>
            <CategorySelect />
          </label>
          <label className="admin-field">
            <span>説明</span>
            <textarea name="description" rows={4} />
          </label>
          <label className="admin-field">
            <span>資料ファイル</span>
            <div className="upload-field">
              <input
                id={inputId}
                type="file"
                name="file"
                accept=".pdf,.xlsx,.xls,.doc,.docx"
                className="upload-field__input"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
                required
              />
              <label htmlFor={inputId} className="upload-field__label">
                <span className="upload-field__button">ファイルを選択</span>
                <span className="upload-field__meta">{fileName || "PDF / Excel / Word をアップロード"}</span>
              </label>
            </div>
          </label>
          <div className="admin-form-preview__grid">
            <label className="admin-field">
              <span>公開状態</span>
              <StatusSelect />
            </label>
            <label className="admin-field">
              <span>公開日</span>
              <input type="date" name="publishedAt" />
            </label>
            <label className="admin-field">
              <span>表示順</span>
              <input type="number" name="sortOrder" min="0" defaultValue="0" />
            </label>
          </div>
          <button type="submit" className="button" disabled={pending}>
            {pending ? "保存中..." : "資料を保存"}
          </button>
        </form>
      </article>
    </>
  );
}

function CategorySelect() {
  const options: Array<{ value: DownloadCategory; label: string }> = [
    { value: "REGULATION", label: "規約" },
    { value: "GUIDELINE", label: "ガイドライン" },
    { value: "DOCUMENT", label: "資料" },
    { value: "OTHER", label: "その他" },
  ];

  return (
    <select name="category" defaultValue="DOCUMENT">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusSelect() {
  const options: Array<{ value: PublishStatus; label: string }> = [
    { value: "DRAFT", label: "下書き" },
    { value: "PUBLISHED", label: "公開" },
    { value: "ARCHIVED", label: "非公開" },
  ];

  return (
    <select name="status" defaultValue="DRAFT">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
