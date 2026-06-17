"use client";

import type { CompetitionStatus, CompetitionType, PublishStatus } from "@prisma/client";
import { useActionState, useEffect, useState } from "react";
import {
  assignTeamToDivision,
  createCompetition,
  createDivision,
  createSeason,
  deleteCompetition,
  deleteDivision,
  deleteSeason,
  removeTeamFromDivision,
  type CompetitionActionState,
  updateCompetition,
  updateDivision,
  updateSeason,
} from "@/app/admin/competitions/actions";
import { ConfirmForm } from "@/components/confirm-form";

const initialCompetitionActionState: CompetitionActionState = {
  status: "idle",
  message: "",
};

type SeasonOption = {
  id: string;
  year: number;
  label: string;
  isCurrent: boolean;
  competitionCount: number;
};

type CompetitionOption = {
  id: string;
  seasonId: string;
  name: string;
  slug: string;
  seasonLabel: string;
  competitionType: CompetitionType;
  edition: number | null;
  summary: string;
  startDate: string;
  endDate: string;
  publishedAt: string;
  status: CompetitionStatus;
  sortOrder: number;
  divisionCount: number;
  fileCount: number;
  newsPostCount: number;
};

type DivisionOption = {
  id: string;
  competitionId: string;
  name: string;
  slug: string;
  competitionLabel: string;
  description: string;
  status: PublishStatus;
  sortOrder: number;
  teamCount: number;
  matchCount: number;
  standingCount: number;
  assignmentCount: number;
};

type TeamOption = {
  id: string;
  name: string;
  region: string | null;
};

type DivisionTeamRow = {
  id: string;
  divisionLabel: string;
  teamName: string;
  region: string | null;
};

export function AdminCompetitionForms({
  seasons,
  competitions,
  divisions,
  teams,
  divisionTeams,
}: {
  seasons: SeasonOption[];
  competitions: CompetitionOption[];
  divisions: DivisionOption[];
  teams: TeamOption[];
  divisionTeams: DivisionTeamRow[];
}) {
  const [seasonState, seasonAction, seasonPending] = useActionState(
    createSeason,
    initialCompetitionActionState,
  );
  const [competitionState, competitionAction, competitionPending] = useActionState(
    createCompetition,
    initialCompetitionActionState,
  );
  const [divisionState, divisionAction, divisionPending] = useActionState(
    createDivision,
    initialCompetitionActionState,
  );
  const [teamAssignmentState, teamAssignmentAction, teamAssignmentPending] = useActionState(
    assignTeamToDivision,
    initialCompetitionActionState,
  );
  const [toast, setToast] = useState<CompetitionActionState>(initialCompetitionActionState);

  useEffect(() => {
    if (seasonState.status !== "idle") setToast(seasonState);
  }, [seasonState]);

  useEffect(() => {
    if (competitionState.status !== "idle") setToast(competitionState);
  }, [competitionState]);

  useEffect(() => {
    if (divisionState.status !== "idle") setToast(divisionState);
  }, [divisionState]);

  useEffect(() => {
    if (teamAssignmentState.status !== "idle") setToast(teamAssignmentState);
  }, [teamAssignmentState]);

  return (
    <>
      {toast.status !== "idle" ? (
        <div className={`admin-toast admin-toast--${toast.status}`} role="status" aria-live="polite">
          <p>{toast.message}</p>
          <button type="button" className="button button--ghost" onClick={() => setToast(initialCompetitionActionState)}>
            閉じる
          </button>
        </div>
      ) : null}

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Competitions</p>
            <h3>大会を編集・削除</h3>
          </div>
        </div>
        <div className="admin-item-list">
          {competitions.length > 0 ? (
            competitions.map((competition) => (
              <CompetitionEditor key={competition.id} competition={competition} seasons={seasons} onDone={setToast} />
            ))
          ) : (
            <p className="admin-muted">まだ大会は登録されていません。</p>
          )}
        </div>
      </article>

      <div className="admin-columns">
        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Competition</p>
              <h3>大会を追加</h3>
            </div>
          </div>
          <form action={competitionAction} className="admin-form-stack">
            <label className="admin-field">
              <span>年度</span>
              <select name="seasonId" defaultValue="" required>
                <option value="" disabled>
                  年度を選択
                </option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>大会名</span>
              <input type="text" name="name" placeholder="第103回 東京リーグ" required />
            </label>
            <label className="admin-field">
              <span>大会種別</span>
              <select name="competitionType" defaultValue="LEAGUE">
                <option value="LEAGUE">東京リーグ向け</option>
                <option value="CUP">5年生FES 山藤杯向け</option>
                <option value="OTHER">その他</option>
              </select>
            </label>
            <label className="admin-field">
              <span>回次</span>
              <input type="number" name="edition" min="1" placeholder="103" />
            </label>
            <label className="admin-field">
              <span>補足</span>
              <input type="text" name="summary" placeholder="山藤杯はPDF掲載中心 / 東京リーグは画像+補助入力" />
            </label>
            <div className="admin-form-preview__grid">
              <label className="admin-field">
                <span>開始日</span>
                <input type="date" name="startDate" />
              </label>
              <label className="admin-field">
                <span>終了日</span>
                <input type="date" name="endDate" />
              </label>
              <label className="admin-field">
                <span>公開日</span>
                <input type="date" name="publishedAt" />
              </label>
              <label className="admin-field">
                <span>表示順</span>
                <input type="number" name="sortOrder" min="0" defaultValue={0} />
              </label>
            </div>
            <label className="admin-field">
              <span>状態</span>
              <select name="status" defaultValue="DRAFT">
                <option value="DRAFT">下書き</option>
                <option value="PUBLISHED">公開</option>
                <option value="CLOSED">終了</option>
              </select>
            </label>
            <button type="submit" className="button" disabled={competitionPending}>
              {competitionPending ? "保存中..." : "大会を保存"}
            </button>
          </form>
        </article>

        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Division</p>
              <h3>リーグを追加</h3>
            </div>
          </div>
          <form action={divisionAction} className="admin-form-stack">
            <label className="admin-field">
              <span>大会</span>
              <select name="competitionId" defaultValue="" required>
                <option value="" disabled>
                  大会を選択
                </option>
                {competitions
                  .filter((competition) => competition.competitionType === "LEAGUE")
                  .map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {competition.seasonLabel} / {competition.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="admin-field">
              <span>リーグ名</span>
              <input type="text" name="name" placeholder="Aリーグ" required />
            </label>
            <div className="admin-form-preview__grid">
              <label className="admin-field">
                <span>状態</span>
                <select name="status" defaultValue="DRAFT">
                  <option value="DRAFT">下書き</option>
                  <option value="PUBLISHED">公開</option>
                  <option value="ARCHIVED">非公開</option>
                </select>
              </label>
              <label className="admin-field">
                <span>表示順</span>
                <input type="number" name="sortOrder" min="0" placeholder="未入力なら自動" />
              </label>
            </div>
            <label className="admin-field">
              <span>説明</span>
              <textarea name="description" rows={3} />
            </label>
            <p className="admin-muted">URL用の識別子はリーグ名から自動生成されます。</p>
            <button type="submit" className="button" disabled={divisionPending}>
              {divisionPending ? "保存中..." : "リーグを保存"}
            </button>
          </form>
        </article>

        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Teams</p>
              <h3>リーグ所属チームを追加</h3>
            </div>
          </div>
          <form action={teamAssignmentAction} className="admin-form-stack">
            <label className="admin-field">
              <span>リーグ</span>
              <select name="divisionId" defaultValue="" required>
                <option value="" disabled>
                  リーグを選択
                </option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.competitionLabel} / {division.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>チーム</span>
              <select name="teamId" defaultValue="" required>
                <option value="" disabled>
                  チームを選択
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}{team.region ? ` / ${team.region}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>表示順</span>
              <input type="number" name="sortOrder" min="0" placeholder="1" />
            </label>
            <p className="admin-muted">未入力の場合は末尾へ自動で追加します。</p>
            <button type="submit" className="button" disabled={teamAssignmentPending}>
              {teamAssignmentPending ? "追加中..." : "所属チームを追加"}
            </button>
          </form>
        </article>
      </div>

      <details className="admin-disclosure">
        <summary>
          <div>
            <p className="section-kicker">Season</p>
            <h3>年度管理</h3>
            <span>追加・更新・削除は必要な時だけ開きます。</span>
          </div>
          <strong>{seasons.length}件</strong>
        </summary>
        <div className="admin-disclosure__body">
          <form action={seasonAction} className="admin-season-create">
            <div className="admin-form-preview__grid admin-form-preview__grid--three">
              <label className="admin-field">
                <span>年度</span>
                <input type="number" name="year" min="2000" max="2100" placeholder="2026" required />
              </label>
              <label className="admin-field">
                <span>表示名</span>
                <input type="text" name="label" placeholder="2026年度" required />
              </label>
              <label className="admin-check">
                <input type="checkbox" name="isCurrent" />
                <span>現在の年度にする</span>
              </label>
            </div>
            <button type="submit" className="button" disabled={seasonPending}>
              {seasonPending ? "保存中..." : "年度を保存"}
            </button>
          </form>
          <div className="admin-item-list admin-item-list--compact">
            {seasons.length > 0 ? (
              seasons.map((season) => <SeasonEditor key={season.id} season={season} onDone={setToast} />)
            ) : (
              <p className="admin-muted">まだ年度は登録されていません。</p>
            )}
          </div>
        </div>
      </details>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Divisions</p>
            <h3>リーグを編集・削除</h3>
          </div>
        </div>
        <div className="admin-item-list">
          {divisions.length > 0 ? (
            divisions.map((division) => (
              <DivisionEditor key={division.id} division={division} competitions={competitions} onDone={setToast} />
            ))
          ) : (
            <p className="admin-muted">まだリーグは登録されていません。</p>
          )}
        </div>
      </article>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Assignments</p>
            <h3>リーグ所属チーム一覧</h3>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--five">
            <span>リーグ</span>
            <span>チーム名</span>
            <span>地域</span>
            <span>状態</span>
            <span>操作</span>
          </div>
          {divisionTeams.length > 0 ? (
            divisionTeams.map((assignment) => (
              <DivisionTeamDeleteRow key={assignment.id} assignment={assignment} onDone={setToast} />
            ))
          ) : (
            <div className="admin-empty-state">
              <p>まだリーグにチームは割り当てられていません。</p>
            </div>
          )}
        </div>
      </article>
    </>
  );
}

function SeasonEditor({
  season,
  onDone,
}: {
  season: SeasonOption;
  onDone: (state: CompetitionActionState) => void;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateSeason,
    initialCompetitionActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSeason,
    initialCompetitionActionState,
  );
  const deletable = season.competitionCount === 0;

  useEffect(() => {
    if (updateState.status !== "idle") onDone(updateState);
  }, [onDone, updateState]);

  useEffect(() => {
    if (deleteState.status !== "idle") onDone(deleteState);
  }, [deleteState, onDone]);

  return (
    <details className="admin-item-card admin-item-card--disclosure">
      <summary className="admin-item-card__summary">
        <strong>{season.label}</strong>
        <p>
          {season.year} / {season.isCurrent ? "現在年度" : "通常年度"} / 大会 {season.competitionCount}件
        </p>
      </summary>
      <form action={updateAction} className="admin-form-stack">
        <input type="hidden" name="seasonId" value={season.id} />
        <div className="admin-form-preview__grid admin-form-preview__grid--three">
          <label className="admin-field">
            <span>年度</span>
            <input type="number" name="year" min="2000" max="2100" defaultValue={season.year} required />
          </label>
          <label className="admin-field">
            <span>表示名</span>
            <input type="text" name="label" defaultValue={season.label} required />
          </label>
          <label className="admin-check">
            <input type="checkbox" name="isCurrent" defaultChecked={season.isCurrent} />
            <span>現在の年度にする</span>
          </label>
        </div>
        <div className="admin-item-card__actions">
          <button type="submit" className="button" disabled={updatePending}>
            {updatePending ? "更新中..." : "年度を更新"}
          </button>
        </div>
      </form>
      <ConfirmForm action={deleteAction} message="この年度を削除します。よろしいですか？">
        <input type="hidden" name="seasonId" value={season.id} />
        <div className="admin-item-card__actions">
          <button type="submit" className="button button--ghost" disabled={deletePending || !deletable}>
            {deletePending ? "削除中..." : "年度を削除"}
          </button>
          {!deletable ? <span className="admin-inline-message">大会が紐づく年度は削除できません。</span> : null}
        </div>
      </ConfirmForm>
    </details>
  );
}

function CompetitionEditor({
  competition,
  seasons,
  onDone,
}: {
  competition: CompetitionOption;
  seasons: SeasonOption[];
  onDone: (state: CompetitionActionState) => void;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCompetition,
    initialCompetitionActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCompetition,
    initialCompetitionActionState,
  );
  const referenceCount = competition.divisionCount + competition.fileCount + competition.newsPostCount;
  const deletable = referenceCount === 0;

  useEffect(() => {
    if (updateState.status !== "idle") onDone(updateState);
  }, [onDone, updateState]);

  useEffect(() => {
    if (deleteState.status !== "idle") onDone(deleteState);
  }, [deleteState, onDone]);

  return (
    <details className="admin-item-card admin-item-card--disclosure">
      <summary className="admin-item-card__summary">
        <strong>{competition.seasonLabel} / {competition.name}</strong>
        <p>
          {competitionTypeLabel[competition.competitionType]} / {competitionStatusLabel[competition.status]} / リーグ{" "}
          {competition.divisionCount}件
        </p>
      </summary>
      <form action={updateAction} className="admin-form-stack">
        <input type="hidden" name="competitionId" value={competition.id} />
        <div className="admin-form-preview__grid">
          <label className="admin-field">
            <span>年度</span>
            <select name="seasonId" defaultValue={competition.seasonId} required>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>大会名</span>
            <input type="text" name="name" defaultValue={competition.name} required />
          </label>
          <label className="admin-field">
            <span>URL識別子</span>
            <input type="text" name="slug" defaultValue={competition.slug} required />
          </label>
          <label className="admin-field">
            <span>大会種別</span>
            <CompetitionTypeSelect defaultValue={competition.competitionType} />
          </label>
          <label className="admin-field">
            <span>回次</span>
            <input type="number" name="edition" min="1" defaultValue={competition.edition ?? ""} />
          </label>
          <label className="admin-field">
            <span>表示順</span>
            <input type="number" name="sortOrder" min="0" defaultValue={competition.sortOrder} />
          </label>
          <label className="admin-field">
            <span>開始日</span>
            <input type="date" name="startDate" defaultValue={competition.startDate} />
          </label>
          <label className="admin-field">
            <span>終了日</span>
            <input type="date" name="endDate" defaultValue={competition.endDate} />
          </label>
          <label className="admin-field">
            <span>公開日</span>
            <input type="date" name="publishedAt" defaultValue={competition.publishedAt} />
          </label>
          <label className="admin-field">
            <span>状態</span>
            <CompetitionStatusSelect defaultValue={competition.status} />
          </label>
        </div>
        <label className="admin-field">
          <span>補足</span>
          <input type="text" name="summary" defaultValue={competition.summary} />
        </label>
        <div className="admin-item-card__actions">
          <button type="submit" className="button" disabled={updatePending}>
            {updatePending ? "更新中..." : "大会を更新"}
          </button>
        </div>
      </form>
      <ConfirmForm action={deleteAction} message="この大会を削除します。よろしいですか？">
        <input type="hidden" name="competitionId" value={competition.id} />
        <div className="admin-item-card__actions">
          <button type="submit" className="button button--ghost" disabled={deletePending || !deletable}>
            {deletePending ? "削除中..." : "大会を削除"}
          </button>
          {!deletable ? (
            <span className="admin-inline-message">
              リーグ・関連ファイル・ニュースが紐づく大会は削除できません。
            </span>
          ) : null}
        </div>
      </ConfirmForm>
    </details>
  );
}

function DivisionEditor({
  division,
  competitions,
  onDone,
}: {
  division: DivisionOption;
  competitions: CompetitionOption[];
  onDone: (state: CompetitionActionState) => void;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateDivision,
    initialCompetitionActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteDivision,
    initialCompetitionActionState,
  );
  const referenceCount = division.teamCount + division.matchCount + division.standingCount + division.assignmentCount;
  const deletable = referenceCount === 0;
  const leagueCompetitions = competitions.filter((competition) => competition.competitionType === "LEAGUE");

  useEffect(() => {
    if (updateState.status !== "idle") onDone(updateState);
  }, [onDone, updateState]);

  useEffect(() => {
    if (deleteState.status !== "idle") onDone(deleteState);
  }, [deleteState, onDone]);

  return (
    <div className="admin-item-card">
      <div className="admin-item-card__summary">
        <strong>{division.competitionLabel} / {division.name}</strong>
        <p>
          {publishStatusLabel[division.status]} / 所属{division.teamCount}チーム / 試合{division.matchCount}件 /
          順位表{division.standingCount}行
        </p>
      </div>
      <form action={updateAction} className="admin-form-stack">
        <input type="hidden" name="divisionId" value={division.id} />
        <div className="admin-form-preview__grid">
          <label className="admin-field">
            <span>大会</span>
            <select name="competitionId" defaultValue={division.competitionId} required>
              {leagueCompetitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.seasonLabel} / {competition.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>リーグ名</span>
            <input type="text" name="name" defaultValue={division.name} required />
          </label>
          <label className="admin-field">
            <span>URL識別子</span>
            <input type="text" name="slug" defaultValue={division.slug} required />
          </label>
          <label className="admin-field">
            <span>状態</span>
            <PublishStatusSelect defaultValue={division.status} />
          </label>
          <label className="admin-field">
            <span>表示順</span>
            <input type="number" name="sortOrder" min="0" defaultValue={division.sortOrder} />
          </label>
        </div>
        <label className="admin-field">
          <span>説明</span>
          <textarea name="description" rows={3} defaultValue={division.description} />
        </label>
        <div className="admin-item-card__actions">
          <button type="submit" className="button" disabled={updatePending}>
            {updatePending ? "更新中..." : "リーグを更新"}
          </button>
        </div>
      </form>
      <ConfirmForm action={deleteAction} message="このリーグを削除します。よろしいですか？">
        <input type="hidden" name="divisionId" value={division.id} />
        <div className="admin-item-card__actions">
          <button type="submit" className="button button--ghost" disabled={deletePending || !deletable}>
            {deletePending ? "削除中..." : "リーグを削除"}
          </button>
          {!deletable ? (
            <span className="admin-inline-message">所属チーム・試合・順位表・担当割当があるリーグは削除できません。</span>
          ) : null}
        </div>
      </ConfirmForm>
    </div>
  );
}

function DivisionTeamDeleteRow({
  assignment,
  onDone,
}: {
  assignment: DivisionTeamRow;
  onDone: (state: CompetitionActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(
    removeTeamFromDivision,
    initialCompetitionActionState,
  );

  useEffect(() => {
    if (state.status !== "idle") {
      onDone(state);
    }
  }, [onDone, state]);

  return (
    <div className="admin-table__row admin-table__row--five">
      <strong>{assignment.divisionLabel}</strong>
      <span>{assignment.teamName}</span>
      <span>{assignment.region ?? "-"}</span>
      <span>所属中</span>
      <form action={formAction}>
        <input type="hidden" name="assignmentId" value={assignment.id} />
        <button type="submit" className="button button--ghost" disabled={pending}>
          {pending ? "解除中..." : "解除"}
        </button>
      </form>
    </div>
  );
}

function CompetitionTypeSelect({ defaultValue }: { defaultValue: CompetitionType }) {
  return (
    <select name="competitionType" defaultValue={defaultValue}>
      <option value="LEAGUE">東京リーグ向け</option>
      <option value="CUP">5年生FES 山藤杯向け</option>
      <option value="OTHER">その他</option>
    </select>
  );
}

function CompetitionStatusSelect({ defaultValue }: { defaultValue: CompetitionStatus }) {
  return (
    <select name="status" defaultValue={defaultValue}>
      <option value="DRAFT">下書き</option>
      <option value="PUBLISHED">公開</option>
      <option value="CLOSED">終了</option>
    </select>
  );
}

function PublishStatusSelect({ defaultValue }: { defaultValue: PublishStatus }) {
  return (
    <select name="status" defaultValue={defaultValue}>
      <option value="DRAFT">下書き</option>
      <option value="PUBLISHED">公開</option>
      <option value="ARCHIVED">非公開</option>
    </select>
  );
}

const competitionTypeLabel: Record<CompetitionType, string> = {
  LEAGUE: "東京リーグ向け",
  CUP: "5年生FES 山藤杯向け",
  OTHER: "その他",
};

const competitionStatusLabel: Record<CompetitionStatus, string> = {
  DRAFT: "下書き",
  PUBLISHED: "公開",
  CLOSED: "終了",
};

const publishStatusLabel: Record<PublishStatus, string> = {
  DRAFT: "下書き",
  PUBLISHED: "公開",
  ARCHIVED: "非公開",
};
