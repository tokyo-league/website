import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { getAdminScope } from "@/lib/admin-access";

export default async function AdminCompetitionsPage() {
  const scope = await getAdminScope();

  return (
    <AdminLayoutShell
      currentPath="/admin/competitions"
      title="大会管理"
      kicker="Competition"
      scope={scope}
    >
      <div className="admin-columns">
        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Current</p>
              <h3>{scope.admin.role === "OWNER" ? "公開中のリーグ" : "担当リーグ"}</h3>
            </div>
          </div>
          <div className="admin-table">
            <div className="admin-table__row admin-table__row--head">
              <span>リーグ</span>
              <span>大会</span>
              <span>権限</span>
            </div>
            {scope.accessibleDivisions.length > 0 ? (
              scope.accessibleDivisions.map((division) => (
                <div key={division.id} className="admin-table__row">
                  <strong>{division.name}</strong>
                  <span>{division.competitionName}</span>
                  <span>{division.permissions.join(" / ")}</span>
                </div>
              ))
            ) : (
              <div className="admin-empty-state">
                <p>担当リーグがまだ割り当てられていません。</p>
              </div>
            )}
          </div>
        </article>

        <article className="admin-card">
          <h3>作業メモ</h3>
          <div className="admin-form-preview">
            <div className="admin-form-preview__grid">
              <div>
                <span>ログイン権限</span>
                <p>{scope.admin.role === "OWNER" ? "全体管理" : "リーグ担当編集"}</p>
              </div>
              <div>
                <span>担当数</span>
                <p>{scope.admin.role === "OWNER" ? "全リーグ" : `${scope.accessibleDivisions.length}リーグ`}</p>
              </div>
              <div>
                <span>試合結果</span>
                <p>担当リーグのみ入力可能にする予定</p>
              </div>
              <div>
                <span>順位表</span>
                <p>担当権限に応じて編集可否を制御</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </AdminLayoutShell>
  );
}
