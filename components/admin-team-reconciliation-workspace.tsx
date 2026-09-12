"use client";

import { useActionState, useMemo, useState } from "react";
import { reconcileExcelTeamAliases, type ResultActionState } from "@/app/admin/results/actions";

type CandidateTeam = {
  id: string;
  name: string;
  shortName: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  region: string;
  hasLogo: boolean;
  hasUniform: boolean;
};

const initialState: ResultActionState = { status: "idle", message: "" };

export function AdminTeamReconciliationWorkspace({
  divisionId,
  importedNames,
  teams,
}: {
  divisionId: string;
  importedNames: string[];
  teams: CandidateTeam[];
}) {
  const initialMappings = useMemo(
    () => importedNames.map((importedName) => suggestMapping(importedName, teams)),
    [importedNames, teams],
  );
  const [mappings, setMappings] = useState(initialMappings);
  const [state, action, pending] = useActionState(reconcileExcelTeamAliases, initialState);
  const unresolved = mappings.filter((mapping) => !mapping.canonicalTeamId);

  function setCanonical(importedName: string, canonicalTeamId: string) {
    setMappings((current) => current.map((mapping) => {
      if (mapping.importedName !== importedName) return mapping;
      const candidates = getCandidates(mapping.importedName, teams);
      return {
        ...mapping,
        canonicalTeamId,
        sourceTeamId: candidates.find((candidate) => candidate.id !== canonicalTeamId)?.id ?? "",
      };
    }));
  }

  return (
    <article className="admin-card admin-reconciliation-workspace">
      <div className="card__header">
        <div>
          <p className="section-kicker">Team matching workspace</p>
          <h3>不一致チーム名をまとめて名寄せ</h3>
          <p className="admin-section-lead">最長の近似チーム名を正式名称として自動提案しています。判断できないものだけ選択してください。</p>
        </div>
      </div>

      <div className="admin-reconciliation-summary">
        <strong>{mappings.length}件のExcel表記を確認</strong>
        <span>{unresolved.length === 0 ? "すべて自動提案済みです" : `${unresolved.length}件だけ正式名称の確認が必要です`}</span>
      </div>

      <form action={action} className="admin-form-stack">
        <input type="hidden" name="divisionId" value={divisionId} />
        <input type="hidden" name="mappingsJson" value={JSON.stringify(mappings)} />
        <div className="admin-reconciliation-groups">
          {mappings.map((mapping) => {
            const canonical = teams.find((team) => team.id === mapping.canonicalTeamId);
            const candidates = getCandidates(mapping.importedName, teams);
            const source = teams.find((team) => team.id === mapping.sourceTeamId);
            return (
              <section key={mapping.importedName} className={`admin-reconciliation-group${mapping.canonicalTeamId ? "" : " is-unresolved"}`}>
                <div className="admin-reconciliation-group__alias">
                  <span>Excel上の表記</span>
                  <strong>{mapping.importedName}</strong>
                  <small>この表記を略称として追加します</small>
                </div>
                {canonical ? (
                  <div className="admin-reconciliation-group__proposal">
                    <span>自動提案した正式名称</span>
                    <strong>{canonical.name}</strong>
                    <small>{teamDetails(canonical)}{source ? ` / 補完元: ${source.name}` : ""}</small>
                    <details>
                      <summary>候補を変更する</summary>
                      <select value={mapping.canonicalTeamId} onChange={(event) => setCanonical(mapping.importedName, event.target.value)}>
                        {candidates.map((team) => <option key={team.id} value={team.id}>{team.name} — {teamDetails(team)}</option>)}
                      </select>
                    </details>
                  </div>
                ) : (
                  <label className="admin-field admin-reconciliation-group__selection">
                    <span>正式名称として使うチーム <em className="admin-required">※確認が必要</em></span>
                    <select value="" onChange={(event) => setCanonical(mapping.importedName, event.target.value)}>
                      <option value="">候補を選択してください</option>
                      {teams.map((team) => <option key={team.id} value={team.id}>{team.name} — {teamDetails(team)}</option>)}
                    </select>
                  </label>
                )}
              </section>
            );
          })}
        </div>
        <div className="admin-reconciliation-submit">
          <div>
            <strong>一括名寄せの内容</strong>
            <p>略称追加、正式名称側の空欄への情報補完、公開設定、対象リーグへの所属追加を同時に行います。既に入力済みの正式名称側の情報は上書きしません。</p>
          </div>
          <button type="submit" className="button" disabled={pending || unresolved.length > 0}>
            {pending ? "名寄せ中..." : `${mappings.length}件を一括名寄せする`}
          </button>
        </div>
      </form>
      {state.status !== "idle" ? <p className={`admin-inline-message admin-inline-message--${state.status}`}>{state.message} {state.status === "success" ? "入稿ウィザードへ戻ってExcelを再読込してください。" : ""}</p> : null}
    </article>
  );
}

function suggestMapping(importedName: string, teams: CandidateTeam[]) {
  const candidates = getCandidates(importedName, teams);
  const canonical = candidates[0];
  return {
    importedName,
    canonicalTeamId: canonical?.id ?? "",
    sourceTeamId: candidates.find((candidate) => candidate.id !== canonical?.id)?.id ?? "",
  };
}

function getCandidates(importedName: string, teams: CandidateTeam[]) {
  const normalizedImported = normalizeName(importedName);
  return teams
    .filter((team) => {
      const labels = [team.name, ...team.shortName.split(/[\n|]/)].map(normalizeName).filter(Boolean);
      return labels.some((label) => label.includes(normalizedImported) || normalizedImported.includes(label));
    })
    .sort((left, right) => right.name.length - left.name.length || left.name.localeCompare(right.name, "ja"));
}

function normalizeName(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja").replace(/[\s\u3000・･._\-‐‑‒–—―]/g, "");
}

function teamDetails(team: CandidateTeam) {
  return `${team.status === "PUBLISHED" ? "公開" : team.status === "DRAFT" ? "下書き" : "非公開"} / ${team.region || "地域未設定"}${team.hasLogo ? " / ロゴあり" : ""}${team.hasUniform ? " / ユニフォームあり" : ""}`;
}
