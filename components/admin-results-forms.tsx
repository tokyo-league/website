"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useState, type FormEvent } from "react";
import {
  addStandingRow,
  applyUnplayedMatchPointsAdjustment,
  createMatch,
  deleteMatch,
  deleteStanding,
  importMatchesFromExcel,
  regenerateStandingsFromMatches,
  replaceStandings,
  type ResultActionState,
  updateDivisionResultImage,
  updateMatch,
  useGeneratedStarTableAsResultImage,
} from "@/app/admin/results/actions";
import { ConfirmForm } from "@/components/confirm-form";
import type { MatchExcelPreview } from "@/lib/match-excel-import-types";
import { IMAGE_UPLOAD_MAX_BYTES, formatUploadLimit } from "@/lib/upload-limits";

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
  publicResultPath: string;
  resultImagePath: string;
  unplayedMatchPointsAdjustedAt: string;
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

type WorkflowAction = "league" | "file" | "read" | "import" | "recalculate" | "save" | "image" | "complete";

export function AdminResultsForms({
  divisions,
  teams,
  mode = "manager",
}: {
  divisions: DivisionOption[];
  teams: TeamOption[];
  mode?: "manager" | "import";
}) {
  const isImportWizard = mode === "import";
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
  const currentSeasonYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Tokyo" }).format(new Date()));
  const canEditScores = Boolean(
    selectedDivision && (selectedDivision.seasonIsCurrent || selectedDivision.seasonYear === currentSeasonYear),
  );

  const [resultState, resultAction, resultPending] = useActionState(updateDivisionResultImage, initialState);
  const [matchState, matchAction, matchPending] = useActionState(createMatch, initialState);
  const [standingState, standingAction, standingPending] = useActionState(replaceStandings, initialState);
  const [addStandingState, addStandingAction, addStandingPending] = useActionState(addStandingRow, initialState);
  const [regenState, regenerateAction, regeneratePending] = useActionState(regenerateStandingsFromMatches, initialState);
  const [correctionState, correctionAction, correctionPending] = useActionState(applyUnplayedMatchPointsAdjustment, initialState);
  const [generatedImageState, generatedImageAction, generatedImagePending] = useActionState(useGeneratedStarTableAsResultImage, initialState);
  const [toast, setToast] = useState(initialState);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState("");
  const [resultUploadError, setResultUploadError] = useState("");
  const [submissionProgress, setSubmissionProgress] = useState({
    fileSelected: false,
    previewReady: false,
    matchesImported: false,
    standingsRecalculated: false,
    standingsSaved: false,
    resultImageRegistered: false,
  });
  const [highlightedAction, setHighlightedAction] = useState<WorkflowAction>("file");
  const [showSubmissionCompletion, setShowSubmissionCompletion] = useState(false);
  const returnToProgress = useCallback((action: WorkflowAction) => {
    setHighlightedAction("complete");
    window.requestAnimationFrame(() => setHighlightedAction(action));
    document.getElementById("submission-navigator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const goToWorkflowAction = useCallback((action: WorkflowAction) => {
    setHighlightedAction("complete");
    window.requestAnimationFrame(() => {
      setHighlightedAction(action);
      document.getElementById(`workflow-action-${action}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);
  const handleExcelProgress = useCallback((change: Partial<{
    fileSelected: boolean;
    previewReady: boolean;
    matchesImported: boolean;
    standingsRecalculated: boolean;
    standingsSaved: boolean;
    resultImageRegistered: boolean;
  }>) => {
    setSubmissionProgress((current) => ({ ...current, ...change }));
    if (change.fileSelected) {
      // ファイル選択後は、次の必須操作を視覚的にもキーボード操作でも明確にします。
      setHighlightedAction("complete");
      window.requestAnimationFrame(() => {
        setHighlightedAction("read");
        document.getElementById("workflow-action-read")?.focus({ preventScroll: true });
      });
      return;
    }
    if (change.previewReady) returnToProgress("import");
    if (change.matchesImported) returnToProgress("recalculate");
  }, [returnToProgress]);

  useEffect(() => {
    const states = [resultState, matchState, standingState, addStandingState, regenState, correctionState, generatedImageState];
    const latest = [...states].reverse().find((state) => state.status !== "idle");

    if (latest) {
      setToast(latest);
    }
  }, [resultState, matchState, standingState, addStandingState, regenState, correctionState, generatedImageState]);

  useEffect(() => {
    if (resultPreview) {
      return () => URL.revokeObjectURL(resultPreview);
    }
  }, [resultPreview]);

  useEffect(() => {
    setResultUploadError("");
    setResultFileName("");
    setResultPreview(null);
    setSubmissionProgress({
      fileSelected: false,
      previewReady: false,
      matchesImported: false,
      standingsRecalculated: false,
      standingsSaved: false,
      resultImageRegistered: false,
    });
    setHighlightedAction("file");
    setShowSubmissionCompletion(false);
  }, [selectedDivisionId]);

  useEffect(() => {
    if (regenState.status === "success") {
      setSubmissionProgress((current) => ({ ...current, standingsRecalculated: true }));
      returnToProgress("save");
    }
  }, [regenState.status, returnToProgress]);

  useEffect(() => {
    if (standingState.status === "success") {
      setSubmissionProgress((current) => ({ ...current, standingsSaved: true }));
      returnToProgress("image");
    }
  }, [standingState.status, returnToProgress]);

  useEffect(() => {
    if (generatedImageState.status === "success") {
      setSubmissionProgress((current) => ({ ...current, resultImageRegistered: true }));
      returnToProgress("complete");
    }
  }, [generatedImageState.status, returnToProgress]);

  useEffect(() => {
    const isComplete = submissionProgress.fileSelected
      && submissionProgress.previewReady
      && submissionProgress.matchesImported
      && submissionProgress.standingsRecalculated
      && submissionProgress.standingsSaved
      && submissionProgress.resultImageRegistered;
    if (isImportWizard && isComplete) setShowSubmissionCompletion(true);
  }, [isImportWizard, submissionProgress]);

  if (!selectedDivision) {
    return (
      <article className="admin-card admin-selected-league" id="league-selector">
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

      {showSubmissionCompletion ? (
        <div className="admin-completion-modal" role="dialog" aria-modal="true" aria-labelledby="submission-complete-title">
          <div className="admin-completion-modal__backdrop" />
          <section className="admin-completion-modal__content">
            <span className="admin-completion-modal__icon" aria-hidden="true">✓</span>
            <p className="section-kicker">Submission complete</p>
            <h3 id="submission-complete-title">入稿が完了しました</h3>
            <p>試合結果、順位表、星取表の結果画像を更新しました。最後に公開ページで表示を確認してください。</p>
            <div className="admin-completion-modal__next">
              <span>最後にすること</span>
              <strong>公開ページで結果を確認する</strong>
              <small>更新した結果ページを別タブで開きます。表示内容を確認できたら入稿完了です。</small>
              <a href={selectedDivision.publicResultPath} target="_blank" rel="noreferrer" className="button">公開ページを別タブで開く</a>
            </div>
            <button type="button" className="button button--ghost" onClick={() => setShowSubmissionCompletion(false)}>この画面にとどまる</button>
          </section>
        </div>
      ) : null}

      <article className="admin-card admin-selected-league" id="league-selector">
        <div className="card__header">
          <div>
            <p className="section-kicker">Step 1</p>
            <h3>対象リーグ</h3>
            <p className="admin-section-lead">Excelを反映する年度・大会・リーグを先に選びます。</p>
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
        <div id="workflow-action-league" className={`admin-selected-league__context${highlightedAction === "league" ? " workflow-action-highlight" : ""}`} aria-live="polite">
          <span>現在編集中のリーグ</span>
          <strong>{selectedDivision.label}</strong>
          <small>これから行うExcel入稿・順位表更新・結果画像登録は、すべてこのリーグに反映されます。</small>
        </div>
      </article>

      {isImportWizard ? <SubmissionNavigator
        divisionLabel={selectedDivision.label}
        canEditScores={canEditScores}
        hasExistingMatches={selectedDivision.matches.length > 0}
        hasResultImage={Boolean(selectedDivision.resultImagePath)}
        progress={submissionProgress}
        onStepSelect={goToWorkflowAction}
      /> : null}

      {isImportWizard ? <article className="admin-card">
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
      </article> : null}

      {isImportWizard ? <ExcelImportPanel
        key={selectedDivision.id}
        divisionId={selectedDivision.id}
        divisionLabel={selectedDivision.label}
        onToast={setToast}
        onProgressChange={handleExcelProgress}
        highlightedAction={highlightedAction}
      /> : null}

      {!isImportWizard ? <div className="admin-columns">
        <article className="admin-card" id="result-image-upload">
          <div className="card__header">
            <div>
              <p className="section-kicker">Optional</p>
              <h3>結果画像を直接アップロード</h3>
              <p className="admin-section-lead">Excel入稿の通常フローでは、下部の「星取表を結果画像として登録」を使います。</p>
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
            <label className="admin-field">
              <span>結果画像</span>
              <UploadField
                name="resultImageFile"
                fileName={resultFileName}
                label="結果画像を選択"
                hint={`JPG / PNG / WebP、${formatUploadLimit(IMAGE_UPLOAD_MAX_BYTES)}以下。画像をアップロードすると現在の結果画像を置き換えます。`}
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

                  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
                    setResultUploadError(`結果画像は ${formatUploadLimit(IMAGE_UPLOAD_MAX_BYTES)} 以下にしてください。`);
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
          <article className="admin-card" id="manual-match-entry">
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
                <input type="date" name="matchDate" />
              </label>
              <label className="admin-field">
                <span>ホーム <em className="admin-required">※必須</em></span>
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
                <span>アウェイ <em className="admin-required">※必須</em></span>
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
                  <span>ホーム得点 <em className="admin-required">※必須</em></span>
                  <input type="number" name="homeScore" min="0" max="99" required />
                </label>
                <label className="admin-field">
                  <span>アウェイ得点 <em className="admin-required">※必須</em></span>
                  <input type="number" name="awayScore" min="0" max="99" required />
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
      </div> : null}

      <article className="admin-card" id="standings-workbench">
        <div className="card__header">
          <div>
            <p className="section-kicker">Standing</p>
            <h3>順位表を作成・更新</h3>
          </div>
          {canEditScores ? (
            <form action={regenerateAction}>
              <input type="hidden" name="divisionId" value={selectedDivision.id} />
              <button id="workflow-action-recalculate" type="submit" data-workflow-label="次はここをクリック" className={`button button--ghost${highlightedAction === "recalculate" ? " workflow-action-highlight" : ""}`} disabled={regeneratePending}>
                {regeneratePending ? "計算中..." : "試合結果から再計算"}
              </button>
            </form>
          ) : null}
        </div>
        {canEditScores ? (
          <div className="admin-unplayed-match-adjustment">
            <div>
              <p className="admin-unplayed-match-adjustment__eyebrow">Optional adjustment</p>
              <h4>未消化試合がある場合のみ：勝ち点を補正</h4>
              <p>未消化の対戦を▲で表示し、各チームの勝ち点を1試合につき1点減算して順位表を作り直します。公開用の結果画像も更新する場合は、上の「この星取表を結果画像にする」を押してください。</p>
              {selectedDivision.unplayedMatchPointsAdjustedAt ? (
                <small>補正済みです。再実行すると、現在の試合結果で補正し直します。</small>
              ) : null}
            </div>
            <form action={correctionAction}>
              <input type="hidden" name="divisionId" value={selectedDivision.id} />
              <button type="submit" className="button admin-unplayed-match-adjustment__button" disabled={correctionPending}>
                {correctionPending ? "補正中..." : "未消化試合の勝ち点を補正"}
              </button>
            </form>
          </div>
        ) : null}
        {!canEditScores ? (
          <p className="admin-muted">過去大会は結果画像を正本として扱います。スコア入力と再計算は今年度大会のみです。</p>
        ) : null}
        {canEditScores && regenState.status !== "idle" ? (
          <p className={`admin-inline-message admin-inline-message--${regenState.status}`}>{regenState.message}</p>
        ) : null}
        {canEditScores && regenState.status === "success" ? (
          <p className="admin-next-notice">再計算できました。内容を確認したら、下の<strong>「順位表をまとめて保存」</strong>を押してください。</p>
        ) : null}
        {canEditScores && correctionState.status !== "idle" ? (
          <p className={`admin-inline-message admin-inline-message--${correctionState.status}`}>{correctionState.message}</p>
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
              onToast={setToast}
              highlightedAction={highlightedAction}
            />
            {standingState.status === "success" ? (
              <p className="admin-next-notice">順位表を保存しました。<a href="#result-image-entry">次は星取表を結果画像として登録</a>します。</p>
            ) : null}
          </>
        ) : null}
      </article>

      {!isImportWizard ? <article className="admin-card admin-registered-standings">
        <div className="card__header">
          <div>
            <p className="section-kicker">Registered Standings</p>
            <h3>登録済み順位表の確認</h3>
            <p className="admin-section-lead">現在公開される順位表です。試合一覧より先に確認できます。</p>
          </div>
        </div>
        {selectedDivision.standings.length === 0 ? (
          <p className="admin-muted">まだ順位表は登録されていません。上の「試合結果から再計算」後に「順位表をまとめて保存」を押してください。</p>
        ) : (
          <div className="admin-standings-summary">
            <table className="admin-standings-summary__table">
              <thead>
                <tr>
                  <th scope="col">順位</th>
                  <th scope="col">チーム</th>
                  <th scope="col">試合</th>
                  <th scope="col">得失点差</th>
                  <th scope="col">勝点</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {selectedDivision.standings.map((standing) => (
                  <ExistingStandingEditor
                    key={standing.id}
                    divisionId={selectedDivision.id}
                    standing={standing}
                    onToast={setToast}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article> : null}

      {isImportWizard && selectedDivision.teams.length > 0 ? (
        <article className="admin-card admin-result-image-finish" id="result-image-entry">
          <div className="card__header">
            <div>
              <p className="section-kicker">Final Step</p>
              <h3>星取表を結果画像として登録</h3>
              <p className="admin-section-lead">順位表を保存した後に、公開される結果画像をここで更新します。</p>
            </div>
          </div>
          <div className="admin-result-image-actions">
            <p className="admin-next-notice">まず星取表を開いて内容を確認し、問題なければ<strong>結果画像として登録</strong>してください。</p>
            <div className="admin-item-card__actions">
              <a href={standingsImageHref} target="_blank" rel="noreferrer" className="button button--ghost">星取表画像を開く</a>
              <a href={`${standingsImageHref}?download=1`} className="button button--ghost">SVGを保存</a>
              <form action={generatedImageAction}>
                <input type="hidden" name="divisionId" value={selectedDivision.id} />
                <button id="workflow-action-image" type="submit" data-workflow-label="次はここをクリック" className={`button${highlightedAction === "image" ? " workflow-action-highlight" : ""}`} disabled={generatedImagePending}>
                  {generatedImagePending ? "登録中..." : "この星取表を結果画像として登録"}
                </button>
              </form>
            </div>
            {generatedImageState.status === "success" ? <p className="admin-inline-message admin-inline-message--success">登録完了。公開ページの結果画像を更新しました。</p> : null}
          </div>
        </article>
      ) : null}

      {!isImportWizard && canEditScores ? (
        <article className="admin-card admin-registered-matches">
          <div className="card__header">
            <div>
              <p className="section-kicker">Registered Matches</p>
              <h3>登録済み試合</h3>
            </div>
          </div>
          {selectedDivision.matches.length === 0 ? (
            <p className="admin-muted">まだ試合結果は登録されていません。</p>
          ) : (
            <div className="admin-item-list admin-item-list--compact">
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

    </>
  );
}

function SubmissionNavigator({
  divisionLabel,
  canEditScores,
  hasExistingMatches,
  hasResultImage,
  progress,
  onStepSelect,
}: {
  divisionLabel: string;
  canEditScores: boolean;
  hasExistingMatches: boolean;
  hasResultImage: boolean;
  progress: {
    fileSelected: boolean;
    previewReady: boolean;
    matchesImported: boolean;
    standingsRecalculated: boolean;
    standingsSaved: boolean;
    resultImageRegistered: boolean;
  };
  onStepSelect: (action: WorkflowAction) => void;
}) {
  const steps = [
    { label: "対象リーグを確認", detail: divisionLabel, href: "#league-selector", action: "league" as const, complete: true },
    { label: "Excelを選択", detail: progress.fileSelected ? "ファイルを選択済み" : "管理表をアップロード", href: "#excel-import", action: "file" as const, complete: progress.fileSelected, current: !progress.fileSelected },
    { label: "Excelの内容を読む", detail: progress.previewReady ? "読み取り・確認済み" : "チーム名・試合数を確認", href: "#excel-import", action: "read" as const, complete: progress.previewReady, current: progress.fileSelected && !progress.previewReady },
    { label: "試合結果へ反映", detail: "新規追加・既存更新", href: "#excel-import", action: "import" as const, complete: progress.matchesImported, current: progress.previewReady && !progress.matchesImported },
    { label: "順位表を再計算", detail: "試合結果から作成", href: "#standings-workbench", action: "recalculate" as const, complete: progress.standingsRecalculated, current: progress.matchesImported && !progress.standingsRecalculated },
    { label: "順位表をまとめて保存", detail: "公開する順位表を確定", href: "#standing-save", action: "save" as const, complete: progress.standingsSaved, current: progress.standingsRecalculated && !progress.standingsSaved },
    { label: "星取表を結果画像に登録", detail: "公開用の結果画像を更新", href: "#result-image-entry", action: "image" as const, complete: progress.resultImageRegistered, current: progress.standingsSaved && !progress.resultImageRegistered },
  ];
  const nextStep = steps.find((step) => step.current) ?? steps.find((step) => !step.complete);
  const readyForImage = progress.standingsSaved;

  return (
    <article className="admin-card admin-submission-navigator" id="submission-navigator" aria-labelledby="submission-navigator-title">
      <div className="card__header admin-submission-navigator__header">
        <div>
          <p className="section-kicker">Excel Submission Guide</p>
          <h3 id="submission-navigator-title">入稿の進行状況</h3>
          <p className="admin-section-lead">この順番で進めれば、試合結果・順位表・結果画像まで反映できます。</p>
        </div>
        {nextStep ? <a className="button" href={nextStep.href}>次へ進む</a> : <span className="admin-submission-navigator__complete">入稿完了</span>}
      </div>
      <ol className="admin-submission-steps" aria-label="Excel入稿の進行状況">
        {steps.map((step, index) => (
          <li key={step.label} className={`${step.complete ? "is-complete" : ""}${step.current ? " is-current" : ""}`}>
            <button type="button" onClick={() => onStepSelect(step.action)} aria-label={`${index + 1}. ${step.label}の操作へ移動`}>{step.complete ? "✓" : index + 1}</button>
            <a href={step.href}>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </a>
          </li>
        ))}
      </ol>
      {!canEditScores ? <p className="admin-inline-message">過去大会は試合入力・再計算を行わず、結果画像の登録のみを行います。</p> : null}
      {progress.matchesImported && !progress.standingsRecalculated ? <p className="admin-next-notice">試合結果を反映しました。<strong>次は「順位表を再計算」</strong>です。</p> : null}
      {progress.standingsRecalculated && !progress.standingsSaved ? <p className="admin-next-notice">順位表を再計算しました。<strong>次は「順位表をまとめて保存」</strong>です。</p> : null}
      {readyForImage && !progress.resultImageRegistered ? <p className="admin-next-notice">順位表を保存したら、<strong>星取表を結果画像に登録</strong>して公開用画像も更新します。</p> : null}
      {hasExistingMatches && !progress.matchesImported ? <p className="admin-inline-message">すでに登録済みの試合があります。Excelの反映では同じ対戦カードを更新し、Excelにない試合は残ります。</p> : null}
      {hasResultImage && !progress.resultImageRegistered ? <p className="admin-inline-message">現在の結果画像は、星取表を登録するまでそのまま保持されます。</p> : null}
    </article>
  );
}

function CopyImportErrors({ errors }: { errors: string[] }) {
  const [copied, setCopied] = useState(false);
  const copyText = errors.map((error) => `- ${error}`).join("\n");

  async function copyErrors() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="admin-import-errors__copy">
      <label className="admin-field">
        <span>チーム名の名寄せ用（コピーしてチーム編集へ）</span>
        <textarea readOnly rows={Math.min(Math.max(errors.length + 1, 3), 8)} value={copyText} aria-label="Excel読み取りエラーのコピー用テキスト" />
      </label>
      <div className="admin-inline-actions">
        <button type="button" className="button button--ghost" onClick={copyErrors}>エラー一覧をコピー</button>
        <a className="button button--ghost" href="/admin/teams" target="_blank" rel="noreferrer">チーム編集を開く</a>
        {copied ? <span className="admin-inline-message admin-inline-message--success">コピーしました</span> : null}
      </div>
    </div>
  );
}

function ExcelImportPanel({
  divisionId,
  divisionLabel,
  onToast,
  onProgressChange,
  highlightedAction,
}: {
  divisionId: string;
  divisionLabel: string;
  onToast: (state: ResultActionState) => void;
  onProgressChange: (change: Partial<{
    fileSelected: boolean;
    previewReady: boolean;
    matchesImported: boolean;
    standingsRecalculated: boolean;
    standingsSaved: boolean;
    resultImageRegistered: boolean;
  }>) => void;
  highlightedAction: WorkflowAction;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MatchExcelPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewPending, setPreviewPending] = useState(false);
  const [importState, importAction, importPending] = useActionState(importMatchesFromExcel, initialState);

  useEffect(() => {
    if (importState.status !== "idle") onToast(importState);
    if (importState.status === "success") onProgressChange({ matchesImported: true });
  }, [importState, onProgressChange, onToast]);

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setPreviewError("Excelファイルを選択してください。");
      return;
    }

    setPreviewPending(true);
    setPreviewError("");
    setPreview(null);

    try {
      const formData = new FormData();
      formData.set("divisionId", divisionId);
      formData.set("file", file);
      const response = await fetch("/api/admin/results/import-excel/preview", {
        method: "POST",
        body: formData,
      });
      const data = await response.json() as MatchExcelPreview & { message?: string };

      if (!response.ok) throw new Error(data.message || "Excelを読み取れませんでした。");
      setPreview(data);
      onProgressChange({ previewReady: true });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Excelを読み取れませんでした。");
    } finally {
      setPreviewPending(false);
    }
  }

  const createCount = preview?.rows.filter((row) => row.operation === "create").length ?? 0;
  const updateCount = preview?.rows.filter((row) => row.operation === "update").length ?? 0;
  // エラーになった行はプレビュー時点で rows から除外済み。抽出できた有効行は反映できる。
  const canImport = Boolean(preview && preview.rows.length > 0);

  return (
    <article className="admin-card admin-excel-import" id="excel-import">
      <div className="card__header">
        <div>
          <p className="section-kicker">Steps 2–4</p>
          <h3>Excelで試合結果を入稿</h3>
          <p className="admin-section-lead">「管理表」シートを読み取り、確認してから試合結果へ反映します。</p>
        </div>
        <span className="admin-excel-import__badge">.xlsx / .xls</span>
      </div>

      <ol className="admin-import-steps" aria-label="Excel入稿の手順">
        <li className="is-complete"><span>1</span><strong>対象を選択</strong><small>{divisionLabel}</small></li>
        <li className={file ? "is-complete" : "is-current"}><span>2</span><strong>Excelを選択</strong><small>管理表をアップロード</small></li>
        <li className={preview ? "is-complete" : file ? "is-current" : ""}><span>3</span><strong>内容を確認</strong><small>試合数・チーム名を確認</small></li>
        <li className={importState.status === "success" ? "is-complete" : preview ? "is-current" : ""}><span>4</span><strong>試合結果に反映</strong><small>新規追加・既存更新</small></li>
      </ol>

      <form className="admin-form-stack" onSubmit={handlePreview}>
        <div className="admin-field">
          <span>第99回東京リーグなどの結果管理表</span>
          <ExcelUploadField
            fileName={file?.name ?? ""}
            highlighted={highlightedAction === "file"}
            onFileChange={(nextFile) => {
              setFile(nextFile);
              setPreview(null);
              setPreviewError("");
              onProgressChange({
                fileSelected: Boolean(nextFile),
                previewReady: false,
                matchesImported: false,
                standingsRecalculated: false,
                standingsSaved: false,
                resultImageRegistered: false,
              });
            }}
          />
          <small className="admin-field__help">「管理表」シートが入った .xlsx / .xls（5MB以下）を選択してください。</small>
        </div>
        {previewError ? <p className="admin-inline-message admin-inline-message--error" role="alert">{previewError}</p> : null}
        <div className={`admin-next-action${file ? " is-ready" : ""}`}>
          <div>
            <span>次にすること</span>
            <strong>{file ? `「${file.name}」を読み取る` : "Excelファイルを選択する"}</strong>
            <small>{file ? "ファイルを選んだだけでは反映されません。まず内容を読み取って確認します。" : "「管理表」シートを含む .xlsx / .xls を選択してください。"}</small>
          </div>
          <button id="workflow-action-read" type="submit" data-workflow-label="次はここをクリック" className={`button${highlightedAction === "read" ? " workflow-action-highlight" : ""}`} disabled={!file || previewPending || importPending}>
            {previewPending ? "読み取り中..." : "Excelの内容を読み取る"}
          </button>
        </div>
      </form>

      {preview ? (
        <div className="admin-import-preview">
          <div className="admin-import-summary" aria-label="入稿内容の集計">
            <div><span>読み取りシート</span><strong>{preview.sheetName}</strong></div>
            <div><span>反映する試合</span><strong>{preview.rows.length}件</strong></div>
            <div><span>新規追加</span><strong>{createCount}件</strong></div>
            <div><span>既存更新</span><strong>{updateCount}件</strong></div>
          </div>

          {preview.warnings.map((warning) => (
            <p key={warning} className="admin-inline-message admin-import-message">{warning}</p>
          ))}
          {preview.errors.length > 0 ? (
            <div className="admin-import-errors" role="alert">
              <strong>以下の行は反映対象から除外されています</strong>
              <p>チーム名の不一致は、下の一覧をコピーしてチーム編集で名寄せしてください。抽出できた試合は、このまま反映できます。</p>
              <ul>{preview.errors.map((error) => <li key={error}>{error}</li>)}</ul>
              <CopyImportErrors errors={preview.errors} />
            </div>
          ) : null}

          {preview.unmatchedTeamNames.length > 0 ? (
            <a
              className="admin-team-reconciliation-link button"
              href={`/admin/results/reconcile?divisionId=${encodeURIComponent(divisionId)}&names=${encodeURIComponent(JSON.stringify(preview.unmatchedTeamNames))}`}
            >
              不一致チームを名寄せワークスペースで確認する（{preview.unmatchedTeamNames.length}件）
            </a>
          ) : null}

          {preview.rows.length > 0 ? (
            <div className="admin-import-table-wrap">
              <table className="admin-import-table">
                <thead>
                  <tr><th>Excel行</th><th>試合日</th><th>対戦・スコア</th><th>会場</th><th>反映</th></tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={`${row.sourceRow}-${row.homeTeamId}-${row.awayTeamId}`}>
                      <td>{row.sourceRow}</td>
                      <td>{formatJapanDate(row.matchDate)}</td>
                      <td><strong>{row.homeTeamName} {row.homeScore} - {row.awayScore} {row.awayTeamName}</strong></td>
                      <td>{row.venueName || "未設定"}</td>
                      <td><span className={`admin-import-operation admin-import-operation--${row.operation}`}>{row.operation === "update" ? "更新" : "新規"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <form action={importAction} className="admin-import-confirm">
            <input type="hidden" name="divisionId" value={divisionId} />
            <input type="hidden" name="rowsJson" value={JSON.stringify(preview.rows)} />
            <div>
              <span className="admin-next-action__label">確認できたら次にすること</span>
              <strong>{divisionLabel} に {preview.rows.length} 試合を反映する</strong>
              <p>同じ対戦カードは更新し、新しい対戦は追加します。Excelにない既存試合は残ります。試合日が空欄の新規試合は「未設定」として登録し、既存試合は現在の試合日を維持します。</p>
            </div>
            <button id="workflow-action-import" type="submit" data-workflow-label="次はここをクリック" className={`button${highlightedAction === "import" ? " workflow-action-highlight" : ""}`} disabled={!canImport || importPending}>
              {importPending ? "反映中..." : `${preview.rows.length}試合を反映する`}
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function formatJapanDate(value: string | null) {
  if (!value) return "未設定";
  const [year, month, day] = value.split("-");
  return `${year}/${month}/${day}`;
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

  const homeTeamName = teams.find((team) => team.id === match.homeTeamId)?.name ?? "ホーム未設定";
  const awayTeamName = teams.find((team) => team.id === match.awayTeamId)?.name ?? "アウェイ未設定";
  const score = match.homeScore === null || match.awayScore === null
    ? "結果未入力"
    : `${match.homeScore} - ${match.awayScore}`;

  return (
    <details className="admin-item-card admin-item-card--disclosure admin-match-disclosure">
      <summary>
        <div className="admin-match-disclosure__summary">
          <span className="admin-match-disclosure__date">{formatJapanDate(match.matchDate || null)}</span>
          <strong>{homeTeamName} <b>{score}</b> {awayTeamName}</strong>
          <small>{match.venueName || "会場未設定"}</small>
        </div>
        <span className="admin-match-disclosure__edit">編集</span>
      </summary>
      <form action={updateAction} className="admin-form-stack">
        <input type="hidden" name="matchId" value={match.id} />
        <input type="hidden" name="divisionId" value={divisionId} />
        <div className="admin-form-preview__grid admin-match-edit-grid">
          <label className="admin-field">
            <span>試合日</span>
            <input type="date" name="matchDate" defaultValue={match.matchDate} />
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
    </details>
  );
}

function BulkStandingEditor({
  divisionId,
  teams,
  standings,
  action,
  pending,
  onToast,
  highlightedAction,
}: {
  divisionId: string;
  teams: DivisionOption["teams"];
  standings: DivisionOption["standings"];
  action: (payload: FormData) => void;
  pending: boolean;
  onToast: (state: ResultActionState) => void;
  highlightedAction: WorkflowAction;
}) {
  const [rows, setRows] = useState(() => buildStandingRows(teams, standings));
  const formId = `bulk-standing-form-${divisionId}`;

  useEffect(() => {
    setRows(buildStandingRows(teams, standings));
  }, [teams, standings]);

  function updateRow(teamId: string, field: keyof (typeof rows)[number], value: string) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.teamId === teamId
          ? {
              ...row,
              [field]: field === "teamId" || field === "teamName"
                ? value
                : field === "points"
                  ? Number(value) || 0
                  : Math.max(0, Number(value) || 0),
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
    <>
      <form id={formId} action={action}>
        <input type="hidden" name="divisionId" value={divisionId} />
        <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} />
      </form>
      <p className="admin-inline-message">「順位表をまとめて保存」を押すと、結果画像の有無にかかわらず試合結果ページへ反映されます。</p>
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
          <span>操作</span>
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
            <input type="number" value={row.points} onChange={(event) => updateRow(row.teamId, "points", event.target.value)} />
            <StandingTeamDeleteButton
              divisionId={divisionId}
              teamId={row.teamId}
              teamName={row.teamName}
              disabled={pending}
              onToast={onToast}
            />
          </div>
        ))}
      </div>
      <div className="admin-item-card__actions" id="standing-save">
        <button id="workflow-action-save" type="submit" form={formId} data-workflow-label="次はここをクリック" className={`button${highlightedAction === "save" ? " workflow-action-highlight" : ""}`} disabled={pending}>
          {pending ? "保存中..." : "順位表をまとめて保存"}
        </button>
        <button type="button" className="button button--ghost" onClick={resetToSavedRows} disabled={pending}>
          登録値に戻す
        </button>
        <button type="button" className="button button--ghost" onClick={clearRows} disabled={pending}>
          入力をクリア
        </button>
      </div>
    </>
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
    <tr>
      <td className="admin-standings-summary__rank">{standing.rank}</td>
      <td>
        <strong className="admin-standing-summary__team">{standing.teamName}</strong>
      </td>
      <td>{standing.played}</td>
      <td>{standing.goalDifference >= 0 ? `+${standing.goalDifference}` : standing.goalDifference}</td>
      <td className="admin-standings-summary__points">{standing.points}</td>
      <td className="admin-standings-summary__action">
        <ConfirmForm action={deleteAction} message={`${standing.teamName} を順位表とリーグ所属から削除します。よろしいですか？`}>
          <input type="hidden" name="divisionId" value={divisionId} />
          <input type="hidden" name="teamId" value={standing.teamId} />
          <button
            type="submit"
            className="button button--ghost admin-standings-summary__delete"
            disabled={deletePending}
          >
            {deletePending ? "削除中..." : "削除"}
          </button>
        </ConfirmForm>
      </td>
    </tr>
  );
}

function StandingTeamDeleteButton({
  divisionId,
  teamId,
  teamName,
  disabled,
  onToast,
}: {
  divisionId: string;
  teamId: string;
  teamName: string;
  disabled: boolean;
  onToast: (state: ResultActionState) => void;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteStanding, initialState);

  useEffect(() => {
    if (deleteState.status !== "idle") onToast(deleteState);
  }, [deleteState, onToast]);

  return (
    <ConfirmForm action={deleteAction} message={`${teamName} を順位表とリーグ所属から削除します。よろしいですか？`}>
      <input type="hidden" name="divisionId" value={divisionId} />
      <input type="hidden" name="teamId" value={teamId} />
      <button
        type="submit"
        className="button button--ghost admin-standings-table__delete"
        disabled={disabled || deletePending}
      >
        {deletePending ? "削除中..." : "削除"}
      </button>
    </ConfirmForm>
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

function ExcelUploadField({
  fileName,
  onFileChange,
  highlighted,
}: {
  fileName: string;
  onFileChange: (file: File | null) => void;
  highlighted: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="upload-field">
      <input
        id="matchResultsExcel"
        type="file"
        aria-label="第99回東京リーグなどの結果管理表"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="upload-field__input"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor="matchResultsExcel"
        id="workflow-action-file"
        data-workflow-label="次はここをクリック"
        className={`upload-field__label${isDragging ? " is-dragging" : ""}${highlighted ? " workflow-action-highlight" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          onFileChange(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <span className="upload-field__button">Excelを選択</span>
        <span className="upload-field__meta">{fileName || "ここにドラッグ&ドロップ、またはクリックして選択"}</span>
      </label>
    </div>
  );
}

function isAllowedImageFile(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

function isSvgImagePath(path: string) {
  return path.toLowerCase().split("?")[0].endsWith(".svg");
}
