"use client";

import { useActionState, useEffect, useId, useMemo, useState } from "react";
import type { DownloadCategory, PublishStatus } from "@prisma/client";
import {
  createDownload,
  updateDownload,
  type DownloadActionState,
} from "@/app/admin/downloads/actions";

const initialState: DownloadActionState = {
  status: "idle",
  message: "",
};

type AdminDownloadFormProps = {
  mode?: "create" | "edit";
  initialValues?: {
    id: string;
    title: string;
    category: DownloadCategory;
    description: string;
    status: PublishStatus;
    publishedAt: string;
    sortOrder: number;
    assetUrl: string | null;
    originalFilename: string | null;
  };
};

export function AdminDownloadForm({ mode = "create", initialValues }: AdminDownloadFormProps) {
  const action = mode === "edit" ? updateDownload : createDownload;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [toast, setToast] = useState(initialState);
  const inputId = useId();
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (state.status !== "idle") {
      setToast(state);
    }
  }, [state]);

  const heading = mode === "edit" ? "資料を編集" : "資料を追加";
  const kicker = mode === "edit" ? "Edit" : "Create";
  const submitLabel = pending ? "保存中..." : mode === "edit" ? "変更を保存" : "資料を保存";
  const currentFileLabel = useMemo(() => {
    if (!initialValues?.originalFilename) {
      return "";
    }

    return `現在の資料: ${initialValues.originalFilename}`;
  }, [initialValues?.originalFilename]);

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
            <p className="section-kicker">{kicker}</p>
            <h3>{heading}</h3>
          </div>
        </div>
        <form action={formAction} className="admin-form-stack">
          {mode === "edit" && initialValues ? <input type="hidden" name="downloadId" value={initialValues.id} /> : null}
          <label className="admin-field">
            <span>タイトル</span>
            <input type="text" name="title" required defaultValue={initialValues?.title ?? ""} />
          </label>
          <label className="admin-field">
            <span>カテゴリ</span>
            <CategorySelect defaultValue={initialValues?.category ?? "DOCUMENT"} />
          </label>
          <label className="admin-field">
            <span>説明</span>
            <textarea name="description" rows={4} defaultValue={initialValues?.description ?? ""} />
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
                required={mode === "create"}
              />
              <label htmlFor={inputId} className="upload-field__label">
                <span className="upload-field__button">{mode === "edit" ? "資料を差し替える" : "ファイルを選択"}</span>
                <span className="upload-field__meta">
                  {fileName || currentFileLabel || "PDF / Excel / Word をアップロード"}
                </span>
              </label>
            </div>
            {mode === "edit" && initialValues?.assetUrl ? (
              <a
                href={initialValues.assetUrl}
                target="_blank"
                rel="noreferrer"
                className="admin-field__hint admin-field__hint--link"
              >
                現在の資料を確認
              </a>
            ) : null}
          </label>
          <div className="admin-form-preview__grid">
            <label className="admin-field">
              <span>公開状態</span>
              <StatusSelect defaultValue={initialValues?.status ?? "DRAFT"} />
            </label>
            <label className="admin-field">
              <span>公開日</span>
              <input type="date" name="publishedAt" defaultValue={initialValues?.publishedAt ?? ""} />
            </label>
            <label className="admin-field">
              <span>表示順</span>
              <input type="number" name="sortOrder" min="0" defaultValue={initialValues?.sortOrder ?? 0} />
            </label>
          </div>
          <button type="submit" className="button" disabled={pending}>
            {submitLabel}
          </button>
        </form>
      </article>
    </>
  );
}

function CategorySelect({ defaultValue }: { defaultValue: DownloadCategory }) {
  const options: Array<{ value: DownloadCategory; label: string }> = [
    { value: "REGULATION", label: "規約" },
    { value: "GUIDELINE", label: "ガイドライン" },
    { value: "DOCUMENT", label: "資料" },
    { value: "OTHER", label: "その他" },
  ];

  return (
    <select name="category" defaultValue={defaultValue}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({ defaultValue }: { defaultValue: PublishStatus }) {
  const options: Array<{ value: PublishStatus; label: string }> = [
    { value: "DRAFT", label: "下書き" },
    { value: "PUBLISHED", label: "公開" },
    { value: "ARCHIVED", label: "非公開" },
  ];

  return (
    <select name="status" defaultValue={defaultValue}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
