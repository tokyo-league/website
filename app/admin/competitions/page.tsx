import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { divisionCards } from "@/lib/site-data";

export default async function AdminCompetitionsPage() {
  return (
    <AdminLayoutShell currentPath="/admin/competitions" title="大会管理" kicker="Competition">
      <div className="admin-columns">
        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Current</p>
              <h3>公開中のリーグ</h3>
            </div>
          </div>
          <div className="admin-table">
            <div className="admin-table__row admin-table__row--head">
              <span>リーグ</span>
              <span>参加数</span>
              <span>更新日</span>
            </div>
            {divisionCards.map((division) => (
              <div key={division.name} className="admin-table__row">
                <strong>{division.name}</strong>
                <span>{division.teams}</span>
                <span>{division.updatedAt}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <h3>作業メモ</h3>
          <div className="admin-form-preview">
            <div className="admin-form-preview__grid">
              <div>
                <span>大会名</span>
                <p>第103回 東京リーグ</p>
              </div>
              <div>
                <span>年度</span>
                <p>2026年度</p>
              </div>
              <div>
                <span>状態</span>
                <p>公開中</p>
              </div>
              <div>
                <span>関連資料</span>
                <p>要項 / 注意事項</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </AdminLayoutShell>
  );
}
