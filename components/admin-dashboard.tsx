import { adminStats } from "@/lib/site-data";
import type { AdminScope } from "@/lib/admin-access";

export function AdminDashboard({ scope }: { scope: AdminScope }) {
  const stats = [
    { label: "担当リーグ", value: scope.admin.role === "OWNER" ? "全リーグ" : String(scope.accessibleDivisions.length) },
    ...adminStats.slice(1),
  ];

  return (
    <>
      <div className="admin-stats">
        {stats.map((item) => (
          <article key={item.label} className="admin-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      {scope.admin.role !== "OWNER" ? (
        <article className="admin-card">
          <h3>担当リーグ一覧</h3>
          {scope.accessibleDivisions.length > 0 ? (
            <ul className="admin-list">
              {scope.accessibleDivisions.slice(0, 4).map((division) => (
                <li key={division.id}>
                  <strong>
                    {division.competitionName} / {division.name}
                  </strong>
                  <span>{division.permissions.join(" / ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted">担当リーグがまだ割り当てられていません。</p>
          )}
        </article>
      ) : null}
    </>
  );
}
