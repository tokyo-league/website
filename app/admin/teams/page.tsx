import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { teams } from "@/lib/site-data";

export default async function AdminTeamsPage() {
  return (
    <AdminLayoutShell currentPath="/admin/teams" title="チーム管理" kicker="Teams">
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Teams</p>
            <h3>掲載チーム</h3>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head">
            <span>チーム名</span>
            <span>地域</span>
            <span>代表者</span>
            <span>監督</span>
          </div>
          {teams.map((team) => (
            <div key={team.name} className="admin-table__row">
              <strong>{team.name}</strong>
              <span>{team.area}</span>
              <span>{team.representative}</span>
              <span>{team.coach}</span>
            </div>
          ))}
        </div>
      </article>
    </AdminLayoutShell>
  );
}
