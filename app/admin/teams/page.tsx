import Link from "next/link";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminTeamDeleteButton } from "@/components/admin-team-delete-button";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { sortTeamsByName } from "@/lib/team-sort";

const teamStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; status?: string }>;
}) {
  const scope = await requireOwner();
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 80) ?? "";
  const region = params.region?.trim().slice(0, 40) ?? "";
  const status = teamStatuses.find((candidate) => candidate === params.status);
  const where = {
    ...(status ? { status } : {}),
    ...(region ? { region } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { shortName: { contains: query, mode: "insensitive" as const } },
            { region: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [teams, regionRows] = await Promise.all([
    prisma.team.findMany({
      where,
      include: {
        _count: {
          select: {
            divisions: true,
            homeMatches: true,
            awayMatches: true,
            standings: true,
          },
        },
      },
    }),
    prisma.team.findMany({
      where: { region: { not: null } },
      select: { region: true },
      distinct: ["region"],
    }),
  ]);
  const regions = sortTeamsByName(
    regionRows
      .map((team) => team.region?.trim())
      .filter((value): value is string => Boolean(value))
      .map((name) => ({ name })),
  ).map((team) => team.name);
  const sortedTeams = sortTeamsByName(teams);

  return (
    <AdminLayoutShell currentPath="/admin/teams" title="チーム管理" kicker="Teams" scope={scope}>
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Teams</p>
            <h3>掲載チーム</h3>
          </div>
          <Link href="/admin/teams/new" className="button">
            新規追加
          </Link>
        </div>
        <form className="admin-team-filters" action="/admin/teams">
          <label className="admin-field">
            <span>キーワード</span>
            <input name="q" type="search" defaultValue={query} placeholder="チーム名・略称・地域" />
          </label>
          <label className="admin-field">
            <span>地域</span>
            <select name="region" defaultValue={region}>
              <option value="">すべての地域</option>
              {regions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>状態</span>
            <select name="status" defaultValue={status ?? ""}>
              <option value="">すべての状態</option>
              <option value="PUBLISHED">公開</option>
              <option value="DRAFT">下書き</option>
              <option value="ARCHIVED">非公開</option>
            </select>
          </label>
          <div className="admin-team-filters__actions">
            <button type="submit" className="button">
              絞り込む
            </button>
            <Link href="/admin/teams" className="button button--ghost">
              条件をクリア
            </Link>
          </div>
        </form>
        <p className="admin-team-results" aria-live="polite">
          {sortedTeams.length}件（チーム名のあいうえお順）
        </p>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--teams">
            <span>チーム名</span>
            <span>地域</span>
            <span>ユニフォーム</span>
            <span>削除前確認</span>
            <span>操作</span>
          </div>
          {sortedTeams.map((team) => {
            const matchCount = team._count.homeMatches + team._count.awayMatches;
            const referenceCount = team._count.divisions + matchCount + team._count.standings;
            const referenceSummary =
              referenceCount > 0
                ? `所属リーグ ${team._count.divisions} / 試合 ${matchCount} / 順位 ${team._count.standings}`
                : "参照なし";
            const disabledReason =
              referenceCount > 0 ? `参照中のため削除できません: ${referenceSummary}` : undefined;

            return (
              <div key={team.id} className="admin-table__row admin-table__row--teams">
                <strong>{team.name}</strong>
                <span>{team.region ?? "-"}</span>
                <span className="admin-team-uniforms" aria-label={`ホーム ${team.homeUniformColor ?? "未設定"}、アウェイ ${team.awayUniformColor ?? "未設定"}`}>
                  {team.homeUniformColor ? <span>ホーム: {team.homeUniformColor}</span> : null}
                  {team.awayUniformColor ? <span>アウェイ: {team.awayUniformColor}</span> : null}
                  {!team.homeUniformColor && !team.awayUniformColor ? <span>未設定</span> : null}
                </span>
                <span className={referenceCount > 0 ? "admin-team-references" : "admin-team-references is-empty"}>
                  {referenceSummary}
                </span>
                <div className="admin-inline-actions">
                  <Link href={`/admin/teams/${team.id}`} className="button button--ghost">
                    編集
                  </Link>
                  <AdminTeamDeleteButton teamId={team.id} disabledReason={disabledReason} />
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </AdminLayoutShell>
  );
}
