import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { divisionCards, matchResults, newsItems, siteAssets } from "@/lib/site-data";

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
              <p>大会概要、リーグ別の結果、関連資料を同じ導線の中で確認できる構成です。</p>
              <div className="page-intro__actions">
                <Link href="/downloads" className="button">
                  要項を見る
                </Link>
                <Link href="/news" className="button button--ghost">
                  関連ニュース
                </Link>
              </div>
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
          <div className="container competition-layout">
            <article className="card">
              <div className="card__header">
                <div>
                  <p className="section-kicker">Result Image</p>
                  <h2>最新の試合結果</h2>
                </div>
                <span className="subtle-label">Aリーグ / 最終更新 03.22</span>
              </div>
              <div className="result-feature">
                <div className="result-feature__image">
                  <Image
                    src={siteAssets.heroResult}
                    alt="東京リーグの試合結果画像"
                    fill
                    sizes="(max-width: 960px) 100vw, 42vw"
                  />
                </div>
                <div className="result-feature__copy">
                  <h3>第103回 東京リーグ Aリーグ</h3>
                  <p>現行の結果画像を残しつつ、リーグ詳細ページへ入れる構成を想定しています。</p>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="card__header">
                <div>
                  <p className="section-kicker">Latest Matches</p>
                  <h2>直近の試合結果</h2>
                </div>
                <span className="subtle-label">更新順</span>
              </div>
              <div className="list-stack">
                {matchResults.map((result) => (
                  <article key={`${result.date}-${result.card}`} className="list-row">
                    <p className="list-row__meta">
                      <span>{result.date}</span>
                      <span>{result.venue}</span>
                    </p>
                    <h3>{result.card}</h3>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="section-block">
          <div className="container">
            <div className="pill-row">
              <span>要項PDF</span>
              <span>組み合わせ表</span>
              <span>注意事項</span>
            </div>
            <div className="division-grid division-grid--compact">
              {divisionCards.map((division) => (
                <article key={division.name} className="division-card">
                  <h2>{division.name}</h2>
                  <p>参加 {division.teams}</p>
                  <span>最終更新 {division.updatedAt}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container home-grid">
            <article className="card">
              <div className="card__header">
                <div>
                  <p className="section-kicker">News</p>
                  <h2>大会関連ニュース</h2>
                </div>
                <Link href="/news">一覧へ</Link>
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

            <article className="card card--download">
              <div className="card__header">
                <div>
                  <p className="section-kicker">Documents</p>
                  <h2>大会資料</h2>
                </div>
                <Link href="/downloads">資料一覧へ</Link>
              </div>
              <div className="download-shortcuts">
                <span>リーグ戦要項</span>
                <span>規約</span>
                <span>規約細則</span>
                <span>注意事項</span>
              </div>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
