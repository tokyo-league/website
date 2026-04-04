import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { getAdminScope } from "@/lib/admin-access";
import { newsItems } from "@/lib/site-data";

export default async function AdminNewsPage() {
  const scope = await getAdminScope();

  return (
    <AdminLayoutShell currentPath="/admin/news" title="ニュース管理" kicker="News" scope={scope}>
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Posts</p>
            <h3>ニュース一覧</h3>
          </div>
          <button type="button" className="button">
            新規作成
          </button>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head">
            <span>公開日</span>
            <span>カテゴリ</span>
            <span>タイトル</span>
            <span>状態</span>
          </div>
          {newsItems.map((item) => (
            <div key={item.title} className="admin-table__row">
              <span>{item.date}</span>
              <span>{item.category}</span>
              <strong>{item.title}</strong>
              <span>公開中</span>
            </div>
          ))}
        </div>
      </article>
    </AdminLayoutShell>
  );
}
