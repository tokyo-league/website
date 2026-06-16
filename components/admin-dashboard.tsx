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
    </>
  );
}
