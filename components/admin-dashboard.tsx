import Link from "next/link";
import { adminStats, newsItems } from "@/lib/site-data";

export function AdminDashboard() {
  return (
    <>
      <div className="admin-stats">
        {adminStats.map((item) => (
          <article key={item.label} className="admin-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-columns">
        <article className="admin-card">
          <h3>最近の更新</h3>
          <ul className="admin-list">
            <li>
              <strong>Aリーグ順位表</strong>
              <span>中村</span>
            </li>
            <li>
              <strong>春季大会要項</strong>
              <span>中村</span>
            </li>
            <li>
              <strong>ニュース下書き保存</strong>
              <span>事務局</span>
            </li>
          </ul>
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
