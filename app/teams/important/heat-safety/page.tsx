import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function HeatSafetyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main team-guidance-page">
        <section className="page-intro page-intro--compact">
          <div className="container narrow">
            <p className="section-kicker">For Participating Teams / Summer</p>
            <h1>暑さ対策・熱中症予防</h1>
            <p>暑い時期の試合では、選手と帯同者の安全を最優先に、事前確認と当日のこまめな対応をお願いします。</p>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow team-guidance-page__content">
            <div>
              <p className="section-kicker">Before the match</p>
              <h2>試合前に確認すること</h2>
              <ul className="team-guidance-page__checklist">
                <li>当日の気象状況・暑さ指数など、暑熱環境を事前に確認する</li>
                <li>選手の体調、十分な飲料、休憩時の環境をチーム内で確認する</li>
                <li>体調不良や不安がある選手に、無理な参加をさせない</li>
              </ul>
            </div>
            <div>
              <p className="section-kicker">On the day</p>
              <h2>試合当日の対応</h2>
              <p>試合中も選手の様子を継続して確認してください。異変が見られる場合は、直ちにプレーを止め、会場責任者・大会運営へ連絡してください。</p>
            </div>
            <aside className="team-guidance-page__priority">
              <h2>判断の優先順位</h2>
              <p>試合の実施・中断・中止については、当日の大会運営からの連絡と、最新の公式案内を優先してください。</p>
              <div className="page-intro__actions">
                <Link href="/news/news-06bbf29f" className="button">暑さ対策の最新案内を見る <span aria-hidden="true">→</span></Link>
                <Link href="/news" className="button button--ghost">ニュースを見る</Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
