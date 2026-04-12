"use client";

import { useActionState, useEffect, useState } from "react";
import {
  assignTeamToDivision,
  createCompetition,
  createDivision,
  createSeason,
  removeTeamFromDivision,
  type CompetitionActionState,
} from "@/app/admin/competitions/actions";

const initialCompetitionActionState: CompetitionActionState = {
  status: "idle",
  message: "",
};

type SeasonOption = {
  id: string;
  year: number;
  label: string;
  isCurrent: boolean;
};

type CompetitionOption = {
  id: string;
  name: string;
  seasonLabel: string;
  competitionType: string;
};

type DivisionOption = {
  id: string;
  name: string;
  competitionLabel: string;
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

      <div className="admin-columns">
        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Season</p>
              <h3>年度を追加</h3>
            </div>
          </div>
          <form action={seasonAction} className="admin-form-stack">
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
            <button type="submit" className="button" disabled={seasonPending}>
              {seasonPending ? "保存中..." : "年度を保存"}
            </button>
          </form>
        </article>

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
              <select name="seasonId" defaultValue="">
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
              <select name="competitionId" defaultValue="">
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
              <select name="divisionId" defaultValue="">
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
              <select name="teamId" defaultValue="">
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
