import { auth } from "@/auth";
import { AdminSignOut } from "@/components/admin-sign-out";
import { adminStats } from "@/lib/site-data";

export async function AdminDashboard() {
  const session = await auth();

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="section-kicker section-kicker--on-dark">TL Admin</p>
          <h1>管理画面</h1>
        </div>
        <nav className="admin-sidebar__nav" aria-label="管理メニュー">
          <span className="is-active">ダッシュボード</span>
          <span>ニュース</span>
          <span>大会</span>
          <span>リーグ</span>
          <span>試合結果</span>
          <span>順位表</span>
          <span>チーム</span>
          <span>資料</span>
        </nav>
      </aside>

      <section className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="section-kicker">Operations</p>
            <h2>ダッシュボード</h2>
          </div>
          <div className="admin-heading__actions">
            <p>{session?.user?.name ?? "管理者"} / 2026-03-22 JST</p>
            <AdminSignOut />
          </div>
        </div>

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
            <h3>試合結果入力</h3>
            <div className="admin-form-preview">
              <div className="admin-form-preview__grid">
                <div>
                  <span>試合日</span>
                  <p>2026-03-22</p>
                </div>
                <div>
                  <span>会場</span>
                  <p>江東競技場</p>
                </div>
                <div>
                  <span>ホーム</span>
                  <p>FC EAST</p>
                </div>
                <div>
                  <span>アウェイ</span>
                  <p>CITY CLUB</p>
                </div>
                <div>
                  <span>スコア</span>
                  <p>2 - 1</p>
                </div>
                <div>
                  <span>備考</span>
                  <p>雨天のため20分遅延</p>
                </div>
              </div>
              <div className="button-row">
                <button type="button" className="button button--ghost">
                  下書き保存
                </button>
                <button type="button" className="button">
                  公開して順位表を更新
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
