import Link from "next/link";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminTeamDeleteButton } from "@/components/admin-team-delete-button";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminTeamsPage() {
  const scope = await requireOwner();
  const teams = await prisma.team.findMany({
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
          <div className="admin-table__row admin-table__row--head admin-table__row--five">
            <span>チーム名</span>
            <span>地域</span>
            <span>代表者</span>
            <span>監督</span>
            <span>操作</span>
          </div>
          {teams.map((team) => (
            <div key={team.id} className="admin-table__row admin-table__row--five">
              <strong>{team.name}</strong>
              <span>{team.region ?? "-"}</span>
              <span>{team.representativeName ?? "-"}</span>
              <span>{team.headCoachName ?? "-"}</span>
              <div className="admin-inline-actions">
                <Link href={`/admin/teams/${team.id}`} className="button button--ghost">
                  編集
                </Link>
                <AdminTeamDeleteButton teamId={team.id} />
              </div>
            </div>
          ))}
        </div>
      </article>
    </AdminLayoutShell>
  );
}
