"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { createTeam, type TeamActionState, updateTeam } from "@/app/admin/teams/actions";

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
  photos: {
    label: "チーム画像",
    minWidth: 1200,
    minHeight: 675,
    minAspectRatio: 1.2,
  },
} as const;

type TeamFormValues = {
  id?: string;
  name: string;
  shortName: string;
  profile: string;
  founded: string;
  region: string;
  representativeName: string;
  headCoachName: string;
  websiteUrl: string;
  instagramUrl: string;
  logoPath: string;
  photoPath: string;
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
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");
  const [logoUploadError, setLogoUploadError] = useState("");
  const [photoUploadError, setPhotoUploadError] = useState("");
  const logoInputId = useId();
  const photoInputId = useId();

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

      if (uploadedPhotoPreview) {
        URL.revokeObjectURL(uploadedPhotoPreview);
      }
    };
  }, [uploadedLogoPreview, uploadedPhotoPreview]);

  const logoPreview = uploadedLogoPreview ?? initialValues.logoPath;
  const photoPreview = uploadedPhotoPreview ?? initialValues.photoPath;

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
          {initialValues.photoPath ? <input type="hidden" name="photoPath" value={initialValues.photoPath} /> : null}
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
              hint={mode === "edit" ? "アップロードすると現在のロゴ画像を置き換えます。" : "PNG / JPG / WebP などの画像をアップロードできます。"}
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
            <span>チーム画像</span>
            <UploadField
              inputId={photoInputId}
              name="photoFile"
              fileName={photoFileName}
              label="チーム画像を選択"
              hint={mode === "edit" ? "アップロードすると現在のチーム画像を置き換えます。" : "横長の画像だと一覧で見やすく表示されます。"}
              errorMessage={photoUploadError}
              onFileChange={async (file) => {
                const result = await validateImageFile(file, "photos");

                if (uploadedPhotoPreview) {
                  URL.revokeObjectURL(uploadedPhotoPreview);
                }

                if (result.status === "error") {
                  setPhotoFileName("");
                  setUploadedPhotoPreview(null);
                  setPhotoUploadError(result.message);
                  return;
                }

                setPhotoUploadError("");
                setPhotoFileName(file?.name ?? "");
                setUploadedPhotoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </label>
          {photoPreview ? (
            <AssetPreview
              src={photoPreview}
              alt="選択中のチーム画像"
              width={320}
              height={180}
              wide
              caption={uploadedPhotoPreview ? "アップロード予定のチーム画像" : mode === "edit" ? "現在のチーム画像" : "選択中のチーム画像"}
            />
          ) : null}
          <label className="admin-field">
            <span>結成</span>
            <input type="text" name="founded" defaultValue={initialValues.founded} />
          </label>
          <label className="admin-field">
            <span>地域</span>
            <input type="text" name="region" defaultValue={initialValues.region} />
          </label>
          <label className="admin-field">
            <span>代表者</span>
            <input type="text" name="representativeName" defaultValue={initialValues.representativeName} />
          </label>
          <label className="admin-field">
            <span>監督</span>
            <input type="text" name="headCoachName" defaultValue={initialValues.headCoachName} />
          </label>
          <label className="admin-field">
            <span>公式サイトURL</span>
            <input type="url" name="websiteUrl" defaultValue={initialValues.websiteUrl} />
          </label>
          <label className="admin-field">
            <span>Instagram URL</span>
            <input
              type="text"
              name="instagramUrl"
              placeholder="https://www.instagram.com/team_account/"
              defaultValue={initialValues.instagramUrl}
            />
            <small className="admin-field__help">URL、@アカウント名、アカウント名のみの入力に対応します。</small>
          </label>
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

async function validateImageFile(file: File | null, kind: "logos" | "photos") {
  if (!file) {
    return { status: "idle" as const, message: "" };
  }

  if (!isAllowedImageFile(file)) {
    return { status: "error" as const, message: "JPG / PNG / WebP のみ選択できます。" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { status: "error" as const, message: "画像サイズは 5MB 以下にしてください。" };
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

    if ("minAspectRatio" in rules && width / height < rules.minAspectRatio) {
      return {
        status: "error" as const,
        message: `${rules.label}は横長画像を選択してください。`,
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
