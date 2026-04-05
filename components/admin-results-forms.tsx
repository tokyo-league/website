"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import {
  createMatch,
  deleteMatch,
  deleteStanding,
  regenerateStandingsFromMatches,
  type ResultActionState,
  updateDivisionResultImage,
  updateMatch,
  upsertStanding,
} from "@/app/admin/results/actions";

const initialState: ResultActionState = {
  status: "idle",
  message: "",
};

type DivisionOption = {
  id: string;
  seasonYear: number;
  seasonLabel: string;
  competitionName: string;
  divisionName: string;
  label: string;
  resultImagePath: string;
  description: string;
  teams: Array<{
    id: string;
    name: string;
  }>;
  matches: Array<{
    id: string;
    matchDate: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
    venueName: string;
    note: string;
  }>;
  standings: Array<{
    id: string;
    teamId: string;
    teamName: string;
    rank: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }>;
};

export function AdminResultsForms({
  divisions,
}: {
  divisions: DivisionOption[];
}) {
  const seasons = Array.from(new Map(divisions.map((division) => [division.seasonYear, division.seasonLabel])).entries())
    .sort((left, right) => right[0] - left[0]);
  const [selectedSeasonYear, setSelectedSeasonYear] = useState(seasons[0]?.[0] ?? 0);
  const competitionsForSeason = Array.from(
    new Set(divisions.filter((division) => division.seasonYear === selectedSeasonYear).map((division) => division.competitionName)),
  );
  const [selectedCompetitionName, setSelectedCompetitionName] = useState(competitionsForSeason[0] ?? "");
  const filteredDivisions = divisions.filter(
    (division) =>
      division.seasonYear === selectedSeasonYear && division.competitionName === selectedCompetitionName,
  );
  const [selectedDivisionId, setSelectedDivisionId] = useState(filteredDivisions[0]?.id ?? divisions[0]?.id ?? "");

  useEffect(() => {
    if (!competitionsForSeason.includes(selectedCompetitionName)) {
      setSelectedCompetitionName(competitionsForSeason[0] ?? "");
    }
  }, [competitionsForSeason, selectedCompetitionName]);

  useEffect(() => {
    if (!filteredDivisions.some((division) => division.id === selectedDivisionId)) {
      setSelectedDivisionId(filteredDivisions[0]?.id ?? "");
    }
  }, [filteredDivisions, selectedDivisionId]);

  const selectedDivision = divisions.find((division) => division.id === selectedDivisionId) ?? divisions[0];

  const [resultState, resultAction, resultPending] = useActionState(updateDivisionResultImage, initialState);
  const [matchState, matchAction, matchPending] = useActionState(createMatch, initialState);
  const [standingState, standingAction, standingPending] = useActionState(upsertStanding, initialState);
  const [regenState, regenerateAction, regeneratePending] = useActionState(regenerateStandingsFromMatches, initialState);
  const [toast, setToast] = useState(initialState);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState("");
  const [resultUploadError, setResultUploadError] = useState("");

  useEffect(() => {
    const states = [resultState, matchState, standingState, regenState];
    const latest = [...states].reverse().find((state) => state.status !== "idle");

    if (latest) {
      setToast(latest);
    }
  }, [resultState, matchState, standingState, regenState]);

  useEffect(() => {
    if (resultPreview) {
      return () => URL.revokeObjectURL(resultPreview);
    }
  }, [resultPreview]);

  useEffect(() => {
    setResultUploadError("");
    setResultFileName("");
    setResultPreview(null);
  }, [selectedDivisionId]);

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
        <div className="admin-filter-grid">
          <label className="admin-field">
            <span>年度</span>
            <select value={selectedSeasonYear} onChange={(event) => setSelectedSeasonYear(Number(event.target.value))}>
              {seasons.map(([year, label]) => (
                <option key={year} value={year}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>大会</span>
            <select value={selectedCompetitionName} onChange={(event) => setSelectedCompetitionName(event.target.value)}>
              {competitionsForSeason.map((competitionName) => (
                <option key={competitionName} value={competitionName}>
                  {competitionName}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>リーグ</span>
            <select value={selectedDivision.id} onChange={(event) => setSelectedDivisionId(event.target.value)}>
              {filteredDivisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.divisionName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </article>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Overview</p>
            <h3>選択中リーグの確認</h3>
          </div>
        </div>
        <div className="admin-form-preview__grid admin-form-preview__grid--three">
          <div>
            <span>対象</span>
            <p>{selectedDivision.label}</p>
          </div>
          <div>
            <span>登録試合</span>
            <p>{selectedDivision.matches.length} 件</p>
          </div>
          <div>
            <span>順位表</span>
            <p>{selectedDivision.standings.length} 行</p>
          </div>
          <div>
            <span>所属チーム</span>
            <p>{selectedDivision.teams.length} チーム</p>
          </div>
          <div>
            <span>結果画像</span>
            <p>{selectedDivision.resultImagePath ? "あり" : "未登録"}</p>
          </div>
          <div>
            <span>補足</span>
            <p>{selectedDivision.description || "未登録"}</p>
          </div>
        </div>
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
            {selectedDivision.resultImagePath ? (
              <div className="admin-result-image-group">
                <p className="admin-result-image-group__title">登録済み結果画像</p>
                <div className="admin-asset-preview admin-asset-preview--wide admin-asset-preview--result">
                  <div className="admin-asset-preview__frame admin-asset-preview__frame--wide">
                    <Image
                      src={selectedDivision.resultImagePath}
                      alt={`${selectedDivision.label} の結果画像`}
                      fill
                      sizes="(max-width: 768px) 100vw, 640px"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="admin-muted">このリーグには結果画像がまだ登録されていません。</p>
            )}
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
            {resultPreview ? (
              <div className="admin-asset-preview">
                <p className="admin-asset-preview__caption">アップロード予定の結果画像</p>
                <div className="admin-asset-preview__frame admin-asset-preview__frame--wide">
                  <Image
                    src={resultPreview}
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
          <form action={regenerateAction}>
            <input type="hidden" name="divisionId" value={selectedDivision.id} />
            <button type="submit" className="button button--ghost" disabled={regeneratePending}>
              {regeneratePending ? "計算中..." : "試合結果から再計算"}
            </button>
          </form>
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

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Registered Matches</p>
            <h3>登録済み試合</h3>
          </div>
        </div>
        {selectedDivision.matches.length === 0 ? (
          <p className="admin-muted">まだ試合結果は登録されていません。</p>
        ) : (
          <div className="admin-item-list">
            {selectedDivision.matches.map((match) => (
              <ExistingMatchEditor
                key={match.id}
                divisionId={selectedDivision.id}
                teams={selectedDivision.teams}
                match={match}
                onToast={setToast}
              />
            ))}
          </div>
        )}
      </article>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Registered Standings</p>
            <h3>登録済み順位表</h3>
          </div>
        </div>
        {selectedDivision.standings.length === 0 ? (
          <p className="admin-muted">まだ順位表は登録されていません。</p>
        ) : (
          <div className="admin-item-list">
            {selectedDivision.standings.map((standing) => (
              <ExistingStandingEditor
                key={standing.id}
                divisionId={selectedDivision.id}
                teams={selectedDivision.teams}
                standing={standing}
                onToast={setToast}
              />
            ))}
          </div>
        )}
      </article>
    </>
  );
}

function ExistingMatchEditor({
  divisionId,
  teams,
  match,
  onToast,
}: {
  divisionId: string;
  teams: DivisionOption["teams"];
  match: DivisionOption["matches"][number];
  onToast: (state: ResultActionState) => void;
}) {
  const [updateState, updateAction, updatePending] = useActionState(updateMatch, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteMatch, initialState);

  useEffect(() => {
    if (updateState.status !== "idle") onToast(updateState);
  }, [updateState, onToast]);

  useEffect(() => {
    if (deleteState.status !== "idle") onToast(deleteState);
  }, [deleteState, onToast]);

  return (
    <div className="admin-item-card">
      <form action={updateAction} className="admin-form-stack">
        <input type="hidden" name="matchId" value={match.id} />
        <input type="hidden" name="divisionId" value={divisionId} />
        <div className="admin-form-preview__grid admin-form-preview__grid--compact">
          <label className="admin-field">
            <span>試合日</span>
            <input type="date" name="matchDate" defaultValue={match.matchDate} required />
          </label>
          <label className="admin-field">
            <span>ホーム</span>
            <select name="homeTeamId" defaultValue={match.homeTeamId} required>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>アウェイ</span>
            <select name="awayTeamId" defaultValue={match.awayTeamId} required>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>ホーム得点</span>
            <input type="number" name="homeScore" min="0" defaultValue={match.homeScore ?? ""} />
          </label>
          <label className="admin-field">
            <span>アウェイ得点</span>
            <input type="number" name="awayScore" min="0" defaultValue={match.awayScore ?? ""} />
          </label>
          <label className="admin-field">
            <span>会場</span>
            <input type="text" name="venueName" defaultValue={match.venueName} />
          </label>
        </div>
        <label className="admin-field">
          <span>備考</span>
          <textarea name="note" rows={2} defaultValue={match.note} />
        </label>
        <div className="admin-item-card__actions">
          <button type="submit" className="button" disabled={updatePending}>
            {updatePending ? "保存中..." : "試合結果を更新"}
          </button>
        </div>
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="matchId" value={match.id} />
        <input type="hidden" name="divisionId" value={divisionId} />
        <button type="submit" className="button button--ghost" disabled={deletePending}>
          {deletePending ? "削除中..." : "削除"}
        </button>
      </form>
    </div>
  );
}

function ExistingStandingEditor({
  divisionId,
  teams,
  standing,
  onToast,
}: {
  divisionId: string;
  teams: DivisionOption["teams"];
  standing: DivisionOption["standings"][number];
  onToast: (state: ResultActionState) => void;
}) {
  const [updateState, updateAction, updatePending] = useActionState(upsertStanding, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteStanding, initialState);

  useEffect(() => {
    if (updateState.status !== "idle") onToast(updateState);
  }, [updateState, onToast]);

  useEffect(() => {
    if (deleteState.status !== "idle") onToast(deleteState);
  }, [deleteState, onToast]);

  return (
    <div className="admin-item-card">
      <form action={updateAction} className="admin-form-stack">
        <input type="hidden" name="divisionId" value={divisionId} />
        <div className="admin-form-preview__grid admin-form-preview__grid--five">
          <label className="admin-field">
            <span>チーム</span>
            <select name="teamId" defaultValue={standing.teamId} required>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>順位</span>
            <input type="number" name="rank" min="1" defaultValue={standing.rank} required />
          </label>
          <label className="admin-field">
            <span>試合</span>
            <input type="number" name="played" min="0" defaultValue={standing.played} />
          </label>
          <label className="admin-field">
            <span>勝</span>
            <input type="number" name="won" min="0" defaultValue={standing.won} />
          </label>
          <label className="admin-field">
            <span>分</span>
            <input type="number" name="drawn" min="0" defaultValue={standing.drawn} />
          </label>
          <label className="admin-field">
            <span>負</span>
            <input type="number" name="lost" min="0" defaultValue={standing.lost} />
          </label>
          <label className="admin-field">
            <span>得点</span>
            <input type="number" name="goalsFor" min="0" defaultValue={standing.goalsFor} />
          </label>
          <label className="admin-field">
            <span>失点</span>
            <input type="number" name="goalsAgainst" min="0" defaultValue={standing.goalsAgainst} />
          </label>
          <label className="admin-field">
            <span>勝点</span>
            <input type="number" name="points" min="0" defaultValue={standing.points} />
          </label>
        </div>
        <div className="admin-item-card__actions">
          <button type="submit" className="button" disabled={updatePending}>
            {updatePending ? "保存中..." : "順位表を更新"}
          </button>
        </div>
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="standingId" value={standing.id} />
        <input type="hidden" name="divisionId" value={divisionId} />
        <button type="submit" className="button button--ghost" disabled={deletePending}>
          {deletePending ? "削除中..." : "削除"}
        </button>
      </form>
    </div>
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
