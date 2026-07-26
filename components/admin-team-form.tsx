"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { createTeam, type TeamActionState, updateTeam } from "@/app/admin/teams/actions";
import { IMAGE_UPLOAD_MAX_BYTES, formatUploadLimit } from "@/lib/upload-limits";

const initialTeamActionState: TeamActionState = {
  status: "idle",
  message: "",
};

const CLIENT_IMAGE_RULES = {
  logos: {
    label: "ロゴ画像",
    minWidth: 240,
    minHeight: 240,
  },
} as const;

type TeamFormValues = {
  id?: string;
  name: string;
  shortName: string;
  profile: string;
  region: string;
  logoPath: string;
  homeUniformColor: string;
  awayUniformColor: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
};

export function AdminTeamForm({
  mode,
  initialValues,
}: {
  mode: "create" | "edit";
  initialValues: TeamFormValues;
}) {
  const action = mode === "create" ? createTeam : updateTeam;
  const [state, formAction, pending] = useActionState(action, initialTeamActionState);
  const [toast, setToast] = useState<TeamActionState>(initialTeamActionState);
  const [uploadedLogoPreview, setUploadedLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const [logoUploadError, setLogoUploadError] = useState("");
  const logoInputId = useId();

  useEffect(() => {
    if (state.status !== "idle") {
      setToast(state);
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (uploadedLogoPreview) {
        URL.revokeObjectURL(uploadedLogoPreview);
      }

    };
  }, [uploadedLogoPreview]);

  const logoPreview = uploadedLogoPreview ?? initialValues.logoPath;

  return (
    <>
      {toast.status !== "idle" ? (
        <div className={`admin-toast admin-toast--${toast.status}`} role="status" aria-live="polite">
          <p>{toast.message}</p>
          <button type="button" className="button button--ghost" onClick={() => setToast(initialTeamActionState)}>
            閉じる
          </button>
        </div>
      ) : null}

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Team</p>
            <h3>{mode === "create" ? "チームを追加" : "チームを編集"}</h3>
          </div>
          <Link href="/admin/teams" className="button button--ghost">
            一覧へ戻る
          </Link>
        </div>
        <form action={formAction} className="admin-form-stack">
          {mode === "edit" && initialValues.id ? <input type="hidden" name="teamId" value={initialValues.id} /> : null}
          {initialValues.logoPath ? <input type="hidden" name="logoPath" value={initialValues.logoPath} /> : null}
          <label className="admin-field">
            <span>チーム名</span>
            <input type="text" name="name" defaultValue={initialValues.name} required />
          </label>
          <label className="admin-field">
            <span>略称</span>
            <input type="text" name="shortName" defaultValue={initialValues.shortName} />
          </label>
          <label className="admin-field">
            <span>チーム紹介</span>
            <textarea name="profile" rows={5} defaultValue={initialValues.profile} />
          </label>
          <label className="admin-field">
            <span>ロゴ画像</span>
            <UploadField
              inputId={logoInputId}
              name="logoFile"
              fileName={logoFileName}
              label="ロゴ画像を選択"
              hint={`JPG / PNG / WebP、${formatUploadLimit(IMAGE_UPLOAD_MAX_BYTES)}以下、240x240px以上。${mode === "edit" ? "アップロードすると現在のロゴ画像を置き換えます。" : ""}`}
              errorMessage={logoUploadError}
              onFileChange={async (file) => {
                const result = await validateImageFile(file, "logos");

                if (uploadedLogoPreview) {
                  URL.revokeObjectURL(uploadedLogoPreview);
                }

                if (result.status === "error") {
                  setLogoFileName("");
                  setUploadedLogoPreview(null);
                  setLogoUploadError(result.message);
                  return;
                }

                setLogoUploadError("");
                setLogoFileName(file?.name ?? "");
                setUploadedLogoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </label>
          {logoPreview ? (
            <AssetPreview
              src={logoPreview}
              alt="選択中のロゴ"
              width={120}
              height={120}
              wide={false}
              caption={uploadedLogoPreview ? "アップロード予定のロゴ画像" : mode === "edit" ? "現在のロゴ画像" : "選択中のロゴ画像"}
            />
          ) : null}
          <label className="admin-field">
            <span>地域</span>
            <input type="text" name="region" defaultValue={initialValues.region} />
          </label>
          <fieldset className="admin-uniform-colors">
            <legend>ユニフォームの色</legend>
            <p>ホームとアウェイそれぞれの色・デザインを文字で入力してください。</p>
            <div className="admin-uniform-colors__grid">
              <label className="admin-field">
                <span>ホーム</span>
                <input
                  type="text"
                  name="homeUniformColor"
                  defaultValue={initialValues.homeUniformColor}
                  maxLength={80}
                  placeholder="例：青・白"
                />
              </label>
              <label className="admin-field">
                <span>アウェイ</span>
                <input
                  type="text"
                  name="awayUniformColor"
                  defaultValue={initialValues.awayUniformColor}
                  maxLength={80}
                  placeholder="例：白地に青ライン"
                />
              </label>
            </div>
          </fieldset>
          <label className="admin-field">
            <span>状態</span>
            <select name="status" defaultValue={initialValues.status}>
              <option value="DRAFT">下書き</option>
              <option value="PUBLISHED">公開</option>
              <option value="ARCHIVED">非公開</option>
            </select>
          </label>
          <label className="admin-field">
            <span>表示順</span>
            <input type="number" name="sortOrder" min="0" defaultValue={initialValues.sortOrder} />
          </label>
          <button type="submit" className="button" disabled={pending}>
            {pending ? "保存中..." : mode === "create" ? "チームを保存" : "更新を保存"}
          </button>
        </form>
      </article>
    </>
  );
}

function UploadField({
  inputId,
  name,
  fileName,
  label,
  hint,
  errorMessage,
  onFileChange,
}: {
  inputId: string;
  name: string;
  fileName: string;
  label: string;
  hint: string;
  errorMessage: string;
  onFileChange: (file: File | null) => void | Promise<void>;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="upload-field">
      <input
        id={inputId}
        type="file"
        name={name}
        accept=".jpg,.jpeg,.png,.webp"
        className="upload-field__input"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={inputId}
        className={`upload-field__label${isDragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          const relatedTarget = event.relatedTarget;

          if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);

          const file = event.dataTransfer.files?.[0] ?? null;
          onFileChange(file);
        }}
      >
        <span className="upload-field__button">{label}</span>
        <span className="upload-field__meta">
          {fileName || "ここにドラッグ&ドロップ、またはクリックして選択"}
        </span>
      </label>
      <small className="admin-field__help">{hint}</small>
      {errorMessage ? <small className="admin-field__error">{errorMessage}</small> : null}
    </div>
  );
}

async function validateImageFile(file: File | null, kind: "logos") {
  if (!file) {
    return { status: "idle" as const, message: "" };
  }

  if (!isAllowedImageFile(file)) {
    return { status: "error" as const, message: "JPG / PNG / WebP のみ選択できます。" };
  }

  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return {
      status: "error" as const,
      message: `${CLIENT_IMAGE_RULES[kind].label}は ${formatUploadLimit(IMAGE_UPLOAD_MAX_BYTES)} 以下にしてください。`,
    };
  }

  const rules = CLIENT_IMAGE_RULES[kind];

  try {
    const { width, height } = await readImageSize(file);

    if (width < rules.minWidth || height < rules.minHeight) {
      return {
        status: "error" as const,
        message: `${rules.label}は ${rules.minWidth}x${rules.minHeight}px 以上にしてください。`,
      };
    }

  } catch {
    return { status: "error" as const, message: "画像サイズを確認できませんでした。" };
  }

  return { status: "success" as const, message: "" };
}

function isAllowedImageFile(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

function readImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      reject(new Error("Failed to load image."));
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });
}

function AssetPreview({
  src,
  alt,
  width,
  height,
  wide,
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  wide: boolean;
  caption: string;
}) {
  const className = wide ? "admin-asset-preview admin-asset-preview--wide" : "admin-asset-preview";

  if (src.startsWith("blob:")) {
    return (
      <figure className={className}>
        <img src={src} alt={alt} width={width} height={height} />
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={className}>
      <Image src={src} alt={alt} width={width} height={height} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
