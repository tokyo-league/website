"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createCompetition,
  createDivision,
  createSeason,
  initialCompetitionActionState,
  type CompetitionActionState,
} from "@/app/admin/competitions/actions";

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

export function AdminCompetitionForms({
  seasons,
  competitions,
}: {
  seasons: SeasonOption[];
  competitions: CompetitionOption[];
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
            <label className="admin-field">
              <span>表示順</span>
              <input type="number" name="sortOrder" min="0" placeholder="1" />
            </label>
            <p className="admin-muted">URL用の識別子はリーグ名から自動生成されます。</p>
            <button type="submit" className="button" disabled={divisionPending}>
              {divisionPending ? "保存中..." : "リーグを保存"}
            </button>
          </form>
        </article>
      </div>
    </>
  );
}
