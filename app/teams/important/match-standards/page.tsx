import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function MatchStandardsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main team-guidance-page">
        <section className="page-intro page-intro--compact">
          <div className="container narrow">
            <p className="section-kicker">For Participating Teams / Match Operations</p>
            <h1>試合開催基準・中止判断</h1>
            <p>荒天、会場状況、暑熱環境などで試合への影響が見込まれる場合は、最新の公式連絡を確認してください。</p>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow team-guidance-page__content">
            <div>
              <p className="section-kicker">Confirmation</p>
              <h2>確認する情報</h2>
              <ul className="team-guidance-page__checklist">
                <li>大会運営からの開催・変更・中止に関する連絡</li>
                <li>当日の天候、警報・注意報、会場の利用状況</li>
                <li>各大会の要綱・注意事項に定められた運営条件</li>
              </ul>
            </div>
            <div>
              <p className="section-kicker">Contact</p>
              <h2>連絡を受けたら</h2>
              <p>チーム内で速やかに共有し、集合・移動・会場利用に関する判断を統一してください。会場で判断に迷う場合は、独自に決めず大会運営へ確認してください。</p>
            </div>
            <aside className="team-guidance-page__priority">
              <h2>公式情報を優先</h2>
              <p>本ページは確認の入口です。正式な基準は、各大会の要綱と最新の大会運営からの連絡を優先します。</p>
              <div className="page-intro__actions">
                <Link href="/downloads" className="button">要綱・資料を見る <span aria-hidden="true">→</span></Link>
                <Link href="/news" className="button button--ghost">最新情報を見る</Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
