"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { PublishStatus } from "@prisma/client";
import { createNewsPost, type NewsActionState } from "@/app/admin/news/actions";

const initialState: NewsActionState = {
  status: "idle",
  message: "",
};

export function AdminNewsForm({
  categories,
}: {
  categories: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(createNewsPost, initialState);
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
            <h3>ニュースを新規作成</h3>
          </div>
        </div>
        <form action={formAction} className="admin-form-stack" encType="multipart/form-data">
          <label className="admin-field">
            <span>タイトル</span>
            <input type="text" name="title" required />
          </label>
          <label className="admin-field">
            <span>カテゴリ</span>
            <select name="categoryId" defaultValue="">
              <option value="">未設定</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>概要</span>
            <textarea name="excerpt" rows={3} />
          </label>
          <label className="admin-field">
            <span>本文</span>
            <textarea name="body" rows={8} required />
          </label>
          <label className="admin-field">
            <span>アイキャッチ画像</span>
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
              <StatusSelect name="status" />
            </label>
            <label className="admin-field">
              <span>公開日</span>
              <input type="date" name="publishedAt" />
            </label>
          </div>
          <button type="submit" className="button" disabled={pending}>
            {pending ? "保存中..." : "ニュースを保存"}
          </button>
        </form>
      </article>
    </>
  );
}

function StatusSelect({ name }: { name: string }) {
  const options: Array<{ value: PublishStatus; label: string }> = [
    { value: "DRAFT", label: "下書き" },
    { value: "PUBLISHED", label: "公開" },
    { value: "ARCHIVED", label: "非公開" },
  ];

  return (
    <select name={name} defaultValue="DRAFT">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
