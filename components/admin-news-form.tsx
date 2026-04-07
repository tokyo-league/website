"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { PublishStatus } from "@prisma/client";
import {
  createNewsPost,
  updateNewsPost,
  type NewsActionState,
} from "@/app/admin/news/actions";
import { formatDateTimeLocal } from "@/lib/news-datetime";

const initialState: NewsActionState = {
  status: "idle",
  message: "",
};

type NewsFormValues = {
  id?: string;
  title: string;
  body: string;
  categoryId: string;
  status: PublishStatus;
  publishedAt: string;
  currentEyecatchUrl?: string | null;
};

export function AdminNewsForm({
  categories,
  mode,
  initialValues,
}: {
  categories: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
  initialValues: NewsFormValues;
}) {
  const action = mode === "create" ? createNewsPost : updateNewsPost;
  const [state, formAction, pending] = useActionState(action, initialState);
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
            <p className="section-kicker">{mode === "create" ? "Create" : "Edit"}</p>
            <h3>{mode === "create" ? "ニュースを新規作成" : "ニュースを編集"}</h3>
          </div>
        </div>
        <form action={formAction} className="admin-form-stack" encType="multipart/form-data">
          {mode === "edit" && initialValues.id ? <input type="hidden" name="newsId" value={initialValues.id} /> : null}
          <label className="admin-field">
            <span>タイトル</span>
            <input type="text" name="title" required defaultValue={initialValues.title} />
          </label>
          <label className="admin-field">
            <span>カテゴリ</span>
            <select name="categoryId" defaultValue={initialValues.categoryId}>
              <option value="">未設定</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>本文</span>
            <textarea name="body" rows={8} required defaultValue={initialValues.body} />
          </label>
          <label className="admin-field">
            <span>アイキャッチ画像</span>
            {initialValues.currentEyecatchUrl ? (
              <div className="admin-image-preview admin-image-preview--news">
                <img src={initialValues.currentEyecatchUrl} alt="現在のアイキャッチ画像" />
              </div>
            ) : null}
            <div className="upload-field">
              <input
                id={inputId}
                type="file"
                name="eyecatchFile"
                accept="image/*"
                className="upload-field__input"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
              />
              <label htmlFor={inputId} className="upload-field__label">
                <span className="upload-field__button">画像を選択</span>
                <span className="upload-field__meta">{fileName || "任意。JPG / PNG / WebP など"}</span>
              </label>
            </div>
          </label>
          <div className="admin-form-preview__grid">
            <label className="admin-field">
              <span>公開状態</span>
              <StatusSelect name="status" defaultValue={initialValues.status} />
            </label>
            <label className="admin-field">
              <span>公開日時</span>
              <input type="datetime-local" name="publishedAt" defaultValue={initialValues.publishedAt} />
            </label>
          </div>
          <button type="submit" className="button" disabled={pending}>
            {pending ? "保存中..." : mode === "create" ? "ニュースを保存" : "更新を保存"}
          </button>
        </form>
      </article>
    </>
  );
}

function StatusSelect({ name, defaultValue }: { name: string; defaultValue: PublishStatus }) {
  const options: Array<{ value: PublishStatus; label: string }> = [
    { value: "DRAFT", label: "下書き" },
    { value: "PUBLISHED", label: "公開" },
    { value: "ARCHIVED", label: "非公開" },
  ];

  return (
    <select name={name} defaultValue={defaultValue}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
