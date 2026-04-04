"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import {
  createMatch,
  type ResultActionState,
  updateDivisionResultImage,
  upsertStanding,
} from "@/app/admin/results/actions";

const initialState: ResultActionState = {
  status: "idle",
  message: "",
};

type DivisionOption = {
  id: string;
  label: string;
  resultImagePath: string;
  description: string;
  teams: Array<{
    id: string;
    name: string;
  }>;
};

export function AdminResultsForms({
  divisions,
}: {
  divisions: DivisionOption[];
}) {
  const [selectedDivisionId, setSelectedDivisionId] = useState(divisions[0]?.id ?? "");
  const selectedDivision = divisions.find((division) => division.id === selectedDivisionId) ?? divisions[0];

  const [resultState, resultAction, resultPending] = useActionState(updateDivisionResultImage, initialState);
  const [matchState, matchAction, matchPending] = useActionState(createMatch, initialState);
  const [standingState, standingAction, standingPending] = useActionState(upsertStanding, initialState);
  const [toast, setToast] = useState(initialState);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState("");
  const [resultUploadError, setResultUploadError] = useState("");

  useEffect(() => {
    const states = [resultState, matchState, standingState];
    const latest = states.find((state) => state.status !== "idle");

    if (latest) {
      setToast(latest);
    }
  }, [resultState, matchState, standingState]);

  useEffect(() => {
    if (resultPreview) {
      return () => URL.revokeObjectURL(resultPreview);
    }
  }, [resultPreview]);

  if (!selectedDivision) {
    return (
      <article className="admin-card">
        <p className="admin-muted">対象リーグがありません。大会とリーグを先に作成してください。</p>
      </article>
    );
  }

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
            <p className="section-kicker">Target</p>
            <h3>対象リーグ</h3>
          </div>
        </div>
        <label className="admin-field">
          <span>リーグを選択</span>
          <select value={selectedDivision.id} onChange={(event) => setSelectedDivisionId(event.target.value)}>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.label}
              </option>
            ))}
          </select>
        </label>
      </article>

      <div className="admin-columns">
        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Result Image</p>
              <h3>結果画像</h3>
            </div>
          </div>
          <form action={resultAction} className="admin-form-stack">
            <input type="hidden" name="divisionId" value={selectedDivision.id} />
            {selectedDivision.resultImagePath ? (
              <input type="hidden" name="currentResultImagePath" value={selectedDivision.resultImagePath} />
            ) : null}
            <label className="admin-field">
              <span>結果画像</span>
              <UploadField
                name="resultImageFile"
                fileName={resultFileName}
                label="結果画像を選択"
                hint="画像をアップロードすると現在の結果画像を置き換えます。"
                errorMessage={resultUploadError}
                onFileChange={(file) => {
                  if (resultPreview) {
                    URL.revokeObjectURL(resultPreview);
                  }

                  if (!file) {
                    setResultUploadError("");
                    setResultFileName("");
                    setResultPreview(null);
                    return;
                  }

                  if (!file.type.startsWith("image/")) {
                    setResultUploadError("結果画像は画像ファイルのみ選択できます。");
                    setResultFileName("");
                    setResultPreview(null);
                    return;
                  }

                  if (file.size > 10 * 1024 * 1024) {
                    setResultUploadError("結果画像は 10MB 以下にしてください。");
                    setResultFileName("");
                    setResultPreview(null);
                    return;
                  }

                  setResultUploadError("");
                  setResultFileName(file.name);
                  setResultPreview(URL.createObjectURL(file));
                }}
              />
            </label>
            {(resultPreview ?? selectedDivision.resultImagePath) ? (
              <div className="admin-asset-preview">
                <p className="admin-asset-preview__caption">
                  {resultPreview ? "アップロード予定の結果画像" : "現在の結果画像"}
                </p>
                <div className="admin-asset-preview__frame admin-asset-preview__frame--wide">
                  <Image
                    src={resultPreview ?? selectedDivision.resultImagePath}
                    alt="結果画像プレビュー"
                    fill
                    sizes="(max-width: 768px) 100vw, 480px"
                  />
                </div>
              </div>
            ) : null}
            <label className="admin-field">
              <span>補足説明</span>
              <textarea name="description" rows={4} defaultValue={selectedDivision.description} />
            </label>
            <button type="submit" className="button" disabled={resultPending}>
              {resultPending ? "保存中..." : "結果画像を保存"}
            </button>
          </form>
        </article>

        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Match</p>
              <h3>試合結果を追加</h3>
            </div>
          </div>
          <form action={matchAction} className="admin-form-stack">
            <input type="hidden" name="divisionId" value={selectedDivision.id} />
            <label className="admin-field">
              <span>試合日</span>
              <input type="date" name="matchDate" required />
            </label>
            <label className="admin-field">
              <span>ホーム</span>
              <select name="homeTeamId" required>
                <option value="">選択してください</option>
                {selectedDivision.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>アウェイ</span>
              <select name="awayTeamId" required>
                <option value="">選択してください</option>
                {selectedDivision.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-form-preview__grid">
              <label className="admin-field">
                <span>ホーム得点</span>
                <input type="number" name="homeScore" min="0" />
              </label>
              <label className="admin-field">
                <span>アウェイ得点</span>
                <input type="number" name="awayScore" min="0" />
              </label>
            </div>
            <label className="admin-field">
              <span>会場</span>
              <input type="text" name="venueName" />
            </label>
            <label className="admin-field">
              <span>備考</span>
              <textarea name="note" rows={3} />
            </label>
            <button type="submit" className="button" disabled={matchPending}>
              {matchPending ? "保存中..." : "試合結果を追加"}
            </button>
          </form>
        </article>
      </div>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Standing</p>
            <h3>順位表を更新</h3>
          </div>
        </div>
        <form action={standingAction} className="admin-form-stack">
          <input type="hidden" name="divisionId" value={selectedDivision.id} />
          <div className="admin-form-preview__grid admin-form-preview__grid--five">
            <label className="admin-field">
              <span>チーム</span>
              <select name="teamId" required>
                <option value="">選択してください</option>
                {selectedDivision.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>順位</span>
              <input type="number" name="rank" min="1" required />
            </label>
            <label className="admin-field">
              <span>試合</span>
              <input type="number" name="played" min="0" defaultValue="0" />
            </label>
            <label className="admin-field">
              <span>勝</span>
              <input type="number" name="won" min="0" defaultValue="0" />
            </label>
            <label className="admin-field">
              <span>分</span>
              <input type="number" name="drawn" min="0" defaultValue="0" />
            </label>
            <label className="admin-field">
              <span>負</span>
              <input type="number" name="lost" min="0" defaultValue="0" />
            </label>
            <label className="admin-field">
              <span>得点</span>
              <input type="number" name="goalsFor" min="0" defaultValue="0" />
            </label>
            <label className="admin-field">
              <span>失点</span>
              <input type="number" name="goalsAgainst" min="0" defaultValue="0" />
            </label>
            <label className="admin-field">
              <span>勝点</span>
              <input type="number" name="points" min="0" defaultValue="0" />
            </label>
          </div>
          <button type="submit" className="button" disabled={standingPending}>
            {standingPending ? "保存中..." : "順位表を保存"}
          </button>
        </form>
      </article>
    </>
  );
}

function UploadField({
  name,
  fileName,
  label,
  hint,
  errorMessage,
  onFileChange,
}: {
  name: string;
  fileName: string;
  label: string;
  hint: string;
  errorMessage: string;
  onFileChange: (file: File | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="upload-field">
      <input
        id={name}
        type="file"
        name={name}
        accept="image/*"
        className="upload-field__input"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={name}
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
          onFileChange(event.dataTransfer.files?.[0] ?? null);
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
