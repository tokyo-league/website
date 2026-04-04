"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createTeam, type TeamActionState, updateTeam } from "@/app/admin/teams/actions";
import type { TeamAssetOption } from "@/lib/team-assets";

const initialTeamActionState: TeamActionState = {
  status: "idle",
  message: "",
};

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
  logoPath: string;
  photoPath: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
};

export function AdminTeamForm({
  mode,
  initialValues,
  logoOptions,
  photoOptions,
}: {
  mode: "create" | "edit";
  initialValues: TeamFormValues;
  logoOptions: TeamAssetOption[];
  photoOptions: TeamAssetOption[];
}) {
  const action = mode === "create" ? createTeam : updateTeam;
  const [state, formAction, pending] = useActionState(action, initialTeamActionState);
  const [toast, setToast] = useState<TeamActionState>(initialTeamActionState);
  const [selectedLogo, setSelectedLogo] = useState(initialValues.logoPath);
  const [selectedPhoto, setSelectedPhoto] = useState(initialValues.photoPath);

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
            <select name="logoPath" defaultValue={initialValues.logoPath} onChange={(event) => setSelectedLogo(event.target.value)}>
              <option value="">未選択</option>
              {logoOptions.map((option) => (
                <option key={option.path} value={option.path}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {selectedLogo ? (
            <div className="admin-asset-preview">
              <Image src={selectedLogo} alt="選択中のロゴ" width={120} height={120} />
            </div>
          ) : null}
          <label className="admin-field">
            <span>チーム画像</span>
            <select name="photoPath" defaultValue={initialValues.photoPath} onChange={(event) => setSelectedPhoto(event.target.value)}>
              <option value="">未選択</option>
              {photoOptions.map((option) => (
                <option key={option.path} value={option.path}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {selectedPhoto ? (
            <div className="admin-asset-preview admin-asset-preview--wide">
              <Image src={selectedPhoto} alt="選択中のチーム画像" width={320} height={180} />
            </div>
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
            <span>URL</span>
            <input type="url" name="websiteUrl" defaultValue={initialValues.websiteUrl} />
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
