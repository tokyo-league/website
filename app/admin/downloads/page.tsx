import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { getAdminScope } from "@/lib/admin-access";
import { downloadItems } from "@/lib/site-data";

export default async function AdminDownloadsPage() {
  const scope = await getAdminScope();

  return (
    <AdminLayoutShell currentPath="/admin/downloads" title="資料管理" kicker="Downloads" scope={scope}>
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Documents</p>
            <h3>公開資料一覧</h3>
          </div>
          <button type="button" className="button">
            資料を追加
          </button>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head">
            <span>カテゴリ</span>
            <span>タイトル</span>
            <span>更新日</span>
          </div>
          {downloadItems.map((item) => (
            <div key={item.title} className="admin-table__row">
              <span>{item.category}</span>
              <strong>{item.title}</strong>
              <span>{item.updatedAt}</span>
            </div>
          ))}
        </div>
      </article>
    </AdminLayoutShell>
  );
}
