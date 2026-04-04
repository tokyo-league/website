import Link from "next/link";
import { adminStats, newsItems } from "@/lib/site-data";
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

      <div className="admin-columns">
        <article className="admin-card">
          <h3>{scope.admin.role === "OWNER" ? "公開リーグ一覧" : "担当リーグ一覧"}</h3>
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

        <article className="admin-card">
          <h3>よく使う操作</h3>
          <div className="admin-shortcuts">
            <Link href="/admin/news" className="button">
              ニュースを編集
            </Link>
            <Link href="/admin/competitions" className="button button--ghost">
              大会情報を確認
            </Link>
            <Link href="/admin/teams" className="button button--ghost">
              チーム情報を更新
            </Link>
            <Link href="/admin/downloads" className="button button--ghost">
              資料を差し替え
            </Link>
          </div>
        </article>
      </div>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Preview</p>
            <h3>公開中ニュース</h3>
          </div>
        </div>
        <div className="list-stack">
          {newsItems.map((item) => (
            <article key={item.title} className="list-row">
              <p className="list-row__meta">
                <span>{item.date}</span>
                <span>{item.category}</span>
              </p>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
            </article>
          ))}
        </div>
      </article>
    </>
  );
}
