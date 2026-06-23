"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { PublishStatus } from "@prisma/client";
import {
  createNewsPost,
  updateNewsPost,
  type NewsActionState,
} from "@/app/admin/news/actions";
import { formatDateTimeLocal } from "@/lib/news-datetime";
import {
  IMAGE_UPLOAD_MAX_BYTES,
  NEWS_BODY_IMAGE_MAX_COUNT,
  formatUploadLimit,
} from "@/lib/upload-limits";

const initialState: NewsActionState = {
  status: "idle",
  message: "",
};

type NewsFormValues = {
  id?: string;
  title: string;
  body: string;
  status: PublishStatus;
  publishedAt: string;
  currentEyecatchUrl?: string | null;
  currentBodyImages: Array<{ assetId: string; url: string; filename: string }>;
};

export function AdminNewsForm({
  mode,
  initialValues,
}: {
  mode: "create" | "edit";
  initialValues: NewsFormValues;
}) {
  const action = mode === "create" ? createNewsPost : updateNewsPost;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [toast, setToast] = useState(initialState);
  const eyecatchInputId = useId();
  const bodyImagesInputId = useId();
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [bodyImageFileNames, setBodyImageFileNames] = useState<string[]>([]);
  const [bodyImageUploadError, setBodyImageUploadError] = useState("");
  const [removedBodyImageIds, setRemovedBodyImageIds] = useState<string[]>([]);

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
        <form action={formAction} className="admin-form-stack">
          {mode === "edit" && initialValues.id ? <input type="hidden" name="newsId" value={initialValues.id} /> : null}
          <label className="admin-field">
            <span>タイトル</span>
            <input type="text" name="title" required defaultValue={initialValues.title} />
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
                id={eyecatchInputId}
                type="file"
                name="eyecatchFile"
                accept=".jpg,.jpeg,.png,.webp"
                className="upload-field__input"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;

                  if (file && file.size > IMAGE_UPLOAD_MAX_BYTES) {
                    setFileName("");
                    setUploadError(`アイキャッチ画像は ${formatUploadLimit(IMAGE_UPLOAD_MAX_BYTES)} 以下にしてください。`);
                    return;
                  }

                  setUploadError("");
                  setFileName(file?.name ?? "");
                }}
              />
              <label htmlFor={eyecatchInputId} className="upload-field__label">
                <span className="upload-field__button">画像を選択</span>
                <span className="upload-field__meta">{fileName || "任意。JPG / PNG / WebP"}</span>
              </label>
              <small className="admin-field__help">
                JPG / PNG / WebP、{formatUploadLimit(IMAGE_UPLOAD_MAX_BYTES)}以下。
              </small>
              {uploadError ? <small className="admin-field__error">{uploadError}</small> : null}
            </div>
          </label>
          <div className="admin-field">
            <span>本文画像（複数選択可）</span>
            {initialValues.currentBodyImages.length > 0 ? (
              <div className="admin-news-images" aria-label="登録済みの本文画像">
                {initialValues.currentBodyImages.map((image, index) => {
                  const isRemoved = removedBodyImageIds.includes(image.assetId);

                  return (
                    <label
                      key={image.assetId}
                      className={`admin-news-image${isRemoved ? " is-removed" : ""}`}
                    >
                      <img src={image.url} alt={`登録済み本文画像 ${index + 1}`} />
                      <span className="admin-news-image__name">{image.filename}</span>
                      <span className="admin-news-image__remove">
                        <input
                          type="checkbox"
                          name="removeBodyImageIds"
                          value={image.assetId}
                          checked={isRemoved}
                          onChange={(event) => {
                            setRemovedBodyImageIds((current) =>
                              event.target.checked
                                ? [...current, image.assetId]
                                : current.filter((id) => id !== image.assetId),
                            );
                            setBodyImageUploadError("");
                          }}
                        />
                        保存時に削除
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
            <div className="upload-field">
              <input
                id={bodyImagesInputId}
                type="file"
                name="bodyImageFiles"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                className="upload-field__input"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  const oversizedFile = files.find((file) => file.size > IMAGE_UPLOAD_MAX_BYTES);
                  const retainedCount = initialValues.currentBodyImages.length - removedBodyImageIds.length;

                  if (oversizedFile) {
                    event.target.value = "";
                    setBodyImageFileNames([]);
                    setBodyImageUploadError(
                      `本文画像は1枚あたり ${formatUploadLimit(IMAGE_UPLOAD_MAX_BYTES)} 以下にしてください。`,
                    );
                    return;
                  }

                  if (retainedCount + files.length > NEWS_BODY_IMAGE_MAX_COUNT) {
                    event.target.value = "";
                    setBodyImageFileNames([]);
                    setBodyImageUploadError(`本文画像は最大${NEWS_BODY_IMAGE_MAX_COUNT}枚までです。`);
                    return;
                  }

                  setBodyImageUploadError("");
                  setBodyImageFileNames(files.map((file) => file.name));
                }}
              />
              <label htmlFor={bodyImagesInputId} className="upload-field__label">
                <span className="upload-field__button">本文画像を選択</span>
                <span className="upload-field__meta">
                  {bodyImageFileNames.length > 0
                    ? `${bodyImageFileNames.length}枚選択中`
                    : "任意。複数の画像をまとめて選択できます"}
                </span>
              </label>
              {bodyImageFileNames.length > 0 ? (
                <ul className="admin-upload-file-list" aria-label="追加する本文画像">
                  {bodyImageFileNames.map((name, index) => (
                    <li key={`${name}-${index}`}>{name}</li>
                  ))}
                </ul>
              ) : null}
              <small className="admin-field__help">
                本文の直前に選択順で表示します。最大{NEWS_BODY_IMAGE_MAX_COUNT}枚、JPG / PNG / WebP、1枚あたり
                {formatUploadLimit(IMAGE_UPLOAD_MAX_BYTES)}以下。
              </small>
              {bodyImageUploadError ? (
                <small className="admin-field__error">{bodyImageUploadError}</small>
              ) : null}
            </div>
          </div>
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
