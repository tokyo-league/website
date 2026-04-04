import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { divisionCards, siteAssets } from "@/lib/site-data";

export default function CompetitionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">Competition</p>
              <h1>試合情報</h1>
              <p>
                大会ごとに試合結果、リーグ一覧、関連資料をまとめて確認できる構成を想定しています。
              </p>
            </div>
            <div className="page-intro__visual">
              <Image
                src={siteAssets.competitionHero}
                alt="池2フットボールクラブ"
                fill
                sizes="(max-width: 960px) 100vw, 32vw"
              />
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container">
            <div className="pill-row">
              <span>要項PDF</span>
              <span>組み合わせ表</span>
              <span>注意事項</span>
            </div>
            <div className="division-grid">
              {divisionCards.map((division) => (
                <article key={division.name} className="division-card">
                  <h2>{division.name}</h2>
                  <p>参加 {division.teams}</p>
                  <span>最終更新 {division.updatedAt}</span>
                </article>
              ))}
              <article className="division-card division-card--soft">
                <h2>関連ニュース</h2>
                <p>要項公開 / 組み合わせ更新</p>
                <span>大会に紐づくお知らせ</span>
              </article>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
