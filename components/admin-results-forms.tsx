"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import {
  addStandingRow,
  createMatch,
  deleteMatch,
  deleteStanding,
  regenerateStandingsFromMatches,
  replaceStandings,
  type ResultActionState,
  updateDivisionResultImage,
  updateMatch,
  useGeneratedStarTableAsResultImage,
} from "@/app/admin/results/actions";
import { ConfirmForm } from "@/components/confirm-form";

const initialState: ResultActionState = {
  status: "idle",
  message: "",
};

type DivisionOption = {
  id: string;
  seasonYear: number;
  seasonLabel: string;
  seasonIsCurrent: boolean;
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
    goalDifference: number;
    points: number;
  }>;
};

type TeamOption = {
  id: string;
  name: string;
  region: string;
};

export function AdminResultsForms({
  divisions,
  teams,
}: {
  divisions: DivisionOption[];
  teams: TeamOption[];
}) {
  const seasons = Array.from(new Map(divisions.map((division) => [division.seasonYear, division.seasonLabel])).entries())
    .sort((left, right) => right[0] - left[0]);
  const [selectedSeasonYear, setSelectedSeasonYear] = useState(seasons[0]?.[0] ?? 0);
  const competitionsForSeason = Array.from(
    new Set(divisions.filter((division) => division.seasonYear === selectedSeasonYear).map((division) => division.competitionName)),
  );
  const [selectedCompetitionName, setSelectedCompetitionName] = useState(competitionsForSeason[0] ?? "");
  const filteredDivisions = divisions
    .filter(
      (division) =>
        division.seasonYear === selectedSeasonYear && division.competitionName === selectedCompetitionName,
    )
    .sort(compareDivisionOptions);
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
  const currentSeasonYear = new Date().getFullYear();
  const canEditScores = Boolean(
    selectedDivision && (selectedDivision.seasonIsCurrent || selectedDivision.seasonYear === currentSeasonYear),
  );

  const [resultState, resultAction, resultPending] = useActionState(updateDivisionResultImage, initialState);
  const [matchState, matchAction, matchPending] = useActionState(createMatch, initialState);
  const [standingState, standingAction, standingPending] = useActionState(replaceStandings, initialState);
  const [addStandingState, addStandingAction, addStandingPending] = useActionState(addStandingRow, initialState);
  const [regenState, regenerateAction, regeneratePending] = useActionState(regenerateStandingsFromMatches, initialState);
  const [generatedImageState, generatedImageAction, generatedImagePending] = useActionState(useGeneratedStarTableAsResultImage, initialState);
  const [toast, setToast] = useState(initialState);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState("");
  const [resultUploadError, setResultUploadError] = useState("");

  useEffect(() => {
    const states = [resultState, matchState, standingState, addStandingState, regenState, generatedImageState];
    const latest = [...states].reverse().find((state) => state.status !== "idle");

    if (latest) {
      setToast(latest);
    }
  }, [resultState, matchState, standingState, addStandingState, regenState, generatedImageState]);

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

  const assignedTeamIds = new Set(selectedDivision.teams.map((team) => team.id));
  const addableTeams = teams.filter((team) => !assignedTeamIds.has(team.id));
  const standingsImageHref = `/api/admin/divisions/${selectedDivision.id}/standings-image`;

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
                      unoptimized={isSvgImagePath(selectedDivision.resultImagePath)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="admin-muted">このリーグには結果画像がまだ登録されていません。</p>
            )}
            {selectedDivision.teams.length > 0 ? (
              <div className="admin-item-card__actions">
                <a href={standingsImageHref} target="_blank" rel="noreferrer" className="button button--ghost">
                  星取表画像を開く
                </a>
                <a href={`${standingsImageHref}?download=1`} className="button button--ghost">
                  SVGを保存
                </a>
                <button type="submit" formAction={generatedImageAction} className="button" disabled={generatedImagePending}>
                  {generatedImagePending ? "登録中..." : "この星取表を結果画像にする"}
                </button>
              </div>
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

                  if (!isAllowedImageFile(file)) {
                    setResultUploadError("結果画像はJPG / PNG / WebPのみ選択できます。");
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

        {canEditScores ? (
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
        ) : null}
      </div>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Standing</p>
            <h3>順位表を作成・更新</h3>
          </div>
          {canEditScores ? (
            <form action={regenerateAction}>
              <input type="hidden" name="divisionId" value={selectedDivision.id} />
              <button type="submit" className="button button--ghost" disabled={regeneratePending}>
                {regeneratePending ? "計算中..." : "試合結果から再計算"}
              </button>
            </form>
          ) : null}
        </div>
        {!canEditScores ? (
          <p className="admin-muted">過去大会は結果画像を正本として扱います。スコア入力と再計算は今年度大会のみです。</p>
        ) : null}
        {canEditScores && regenState.status !== "idle" ? (
          <p className={`admin-inline-message admin-inline-message--${regenState.status}`}>{regenState.message}</p>
        ) : null}
        {canEditScores ? (
          <>
            <StandingRowAddForm
              divisionId={selectedDivision.id}
              teams={addableTeams}
              action={addStandingAction}
              pending={addStandingPending}
            />
            <BulkStandingEditor
              key={selectedDivision.id}
              divisionId={selectedDivision.id}
              teams={selectedDivision.teams}
              standings={selectedDivision.standings}
              action={standingAction}
              pending={standingPending}
            />
          </>
        ) : null}
      </article>

      {canEditScores ? (
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
      ) : null}

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Registered Standings</p>
            <h3>登録済み順位表の確認</h3>
          </div>
        </div>
        {selectedDivision.standings.length === 0 ? (
          <p className="admin-muted">まだ順位表は登録されていません。</p>
        ) : (
          <div className="admin-standings-summary">
            {selectedDivision.standings.map((standing) => (
              <ExistingStandingEditor
                key={standing.id}
                divisionId={selectedDivision.id}
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

function StandingRowAddForm({
  divisionId,
  teams,
  action,
  pending,
}: {
  divisionId: string;
  teams: TeamOption[];
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  if (teams.length === 0) {
    return (
      <p className="admin-muted">
        順位表へ追加できる未所属チームはありません。所属済みチームは入力表に表示されています。
      </p>
    );
  }

  return (
    <form action={action} className="admin-standing-add">
      <input type="hidden" name="divisionId" value={divisionId} />
      <label className="admin-field">
        <span>順位表行を追加</span>
        <select name="teamId" defaultValue="" required>
          <option value="" disabled>
            追加するチームを選択
          </option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}{team.region ? ` / ${team.region}` : ""}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="button button--ghost" disabled={pending}>
        {pending ? "追加中..." : "行を追加"}
      </button>
    </form>
  );
}

function compareDivisionOptions(
  a: Pick<DivisionOption, "divisionName">,
  b: Pick<DivisionOption, "divisionName">,
) {
  const aRank = getDivisionRank(a.divisionName);
  const bRank = getDivisionRank(b.divisionName);

  if (aRank !== bRank) {
    return aRank - bRank;
  }

  return a.divisionName.localeCompare(b.divisionName, "ja");
}

function getDivisionRank(name: string) {
  const normalized = name.normalize("NFKC").trim().toLowerCase();
  const match =
    normalized.match(/^([a-z])\s*(?:リーグ|グループ)$/) ??
    normalized.match(/^([a-z])-league$/) ??
    normalized.match(/^([a-z])/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return match[1].toUpperCase().charCodeAt(0) - 65;
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
        <div className="admin-form-preview__grid admin-match-edit-grid">
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
      <ConfirmForm action={deleteAction} message="この試合結果を削除します。よろしいですか？">
        <input type="hidden" name="matchId" value={match.id} />
        <input type="hidden" name="divisionId" value={divisionId} />
        <button type="submit" className="button button--ghost" disabled={deletePending}>
          {deletePending ? "削除中..." : "削除"}
        </button>
      </ConfirmForm>
    </div>
  );
}

function BulkStandingEditor({
  divisionId,
  teams,
  standings,
  action,
  pending,
}: {
  divisionId: string;
  teams: DivisionOption["teams"];
  standings: DivisionOption["standings"];
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const [rows, setRows] = useState(() => buildStandingRows(teams, standings));

  useEffect(() => {
    setRows(buildStandingRows(teams, standings));
  }, [teams, standings]);

  function updateRow(teamId: string, field: keyof (typeof rows)[number], value: string) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.teamId === teamId
          ? {
              ...row,
              [field]: field === "teamId" || field === "teamName" ? value : Math.max(0, Number(value) || 0),
            }
          : row,
      ),
    );
  }

  function resetToSavedRows() {
    setRows(buildStandingRows(teams, standings));
  }

  function clearRows() {
    setRows(buildEmptyStandingRows(teams));
  }

  return (
    <form action={action} className="admin-form-stack">
      <input type="hidden" name="divisionId" value={divisionId} />
      <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} />
      <div className="admin-standings-table">
        <div className="admin-standings-table__head">
          <span>チーム</span>
          <span>順位</span>
          <span>試合</span>
          <span>勝</span>
          <span>分</span>
          <span>負</span>
          <span>得点</span>
          <span>失点</span>
          <span>勝点</span>
        </div>
        {rows.map((row) => (
          <div key={row.teamId} className="admin-standings-table__row">
            <span className="admin-standings-table__team">{row.teamName}</span>
            <input type="number" min="1" value={row.rank} onChange={(event) => updateRow(row.teamId, "rank", event.target.value)} />
            <input type="number" min="0" value={row.played} onChange={(event) => updateRow(row.teamId, "played", event.target.value)} />
            <input type="number" min="0" value={row.won} onChange={(event) => updateRow(row.teamId, "won", event.target.value)} />
            <input type="number" min="0" value={row.drawn} onChange={(event) => updateRow(row.teamId, "drawn", event.target.value)} />
            <input type="number" min="0" value={row.lost} onChange={(event) => updateRow(row.teamId, "lost", event.target.value)} />
            <input type="number" min="0" value={row.goalsFor} onChange={(event) => updateRow(row.teamId, "goalsFor", event.target.value)} />
            <input type="number" min="0" value={row.goalsAgainst} onChange={(event) => updateRow(row.teamId, "goalsAgainst", event.target.value)} />
            <input type="number" min="0" value={row.points} onChange={(event) => updateRow(row.teamId, "points", event.target.value)} />
          </div>
        ))}
      </div>
      <div className="admin-item-card__actions">
        <button type="submit" className="button" disabled={pending}>
          {pending ? "保存中..." : "順位表をまとめて保存"}
        </button>
        <button type="button" className="button button--ghost" onClick={resetToSavedRows} disabled={pending}>
          登録値に戻す
        </button>
        <button type="button" className="button button--ghost" onClick={clearRows} disabled={pending}>
          入力をクリア
        </button>
      </div>
    </form>
  );
}

function buildStandingRows(teams: DivisionOption["teams"], standings: DivisionOption["standings"]) {
  return teams.map((team, index) => {
    const existing = standings.find((standing) => standing.teamId === team.id);

    return {
      teamId: team.id,
      teamName: team.name,
      rank: existing?.rank ?? index + 1,
      played: existing?.played ?? 0,
      won: existing?.won ?? 0,
      drawn: existing?.drawn ?? 0,
      lost: existing?.lost ?? 0,
      goalsFor: existing?.goalsFor ?? 0,
      goalsAgainst: existing?.goalsAgainst ?? 0,
      points: existing?.points ?? 0,
    };
  });
}

function buildEmptyStandingRows(teams: DivisionOption["teams"]) {
  return teams.map((team, index) => ({
    teamId: team.id,
    teamName: team.name,
    rank: index + 1,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
}

function ExistingStandingEditor({
  divisionId,
  standing,
  onToast,
}: {
  divisionId: string;
  standing: DivisionOption["standings"][number];
  onToast: (state: ResultActionState) => void;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteStanding, initialState);

  useEffect(() => {
    if (deleteState.status !== "idle") onToast(deleteState);
  }, [deleteState, onToast]);

  return (
    <div className="admin-item-card">
      <div className="admin-item-card__summary">
        <strong className="admin-standing-summary__team">
          {standing.rank}位 {standing.teamName}
        </strong>
        <p>
          {standing.points} pt / {standing.played}試合 / 得失点差{" "}
          {standing.goalDifference >= 0 ? `+${standing.goalDifference}` : standing.goalDifference}
        </p>
      </div>
      <ConfirmForm action={deleteAction} message="この順位表の行を削除します。よろしいですか？">
        <input type="hidden" name="standingId" value={standing.id} />
        <input type="hidden" name="divisionId" value={divisionId} />
        <button type="submit" className="button button--ghost" disabled={deletePending}>
          {deletePending ? "削除中..." : "削除"}
        </button>
      </ConfirmForm>
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
        accept=".jpg,.jpeg,.png,.webp"
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

function isAllowedImageFile(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

function isSvgImagePath(path: string) {
  return path.toLowerCase().split("?")[0].endsWith(".svg");
}
