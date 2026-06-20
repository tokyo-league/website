import Link from "next/link";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminTeamDeleteButton } from "@/components/admin-team-delete-button";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminTeamsPage() {
  const scope = await requireOwner();
  const teams = await prisma.team.findMany({
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
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

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
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--teams">
            <span>チーム名</span>
            <span>地域</span>
            <span>ユニフォーム</span>
            <span>削除前確認</span>
            <span>操作</span>
          </div>
          {teams.map((team) => {
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
                  {team.homeUniformColor ? <i style={{ backgroundColor: team.homeUniformColor }} /> : null}
                  {team.awayUniformColor ? <i style={{ backgroundColor: team.awayUniformColor }} /> : null}
                  {!team.homeUniformColor && !team.awayUniformColor ? "未設定" : null}
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
