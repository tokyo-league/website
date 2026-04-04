import Image from "next/image";
import Link from "next/link";
import { divisionCards, newsItems, siteAssets } from "@/lib/site-data";

export function PublicHome() {
  return (
    <main>
      <section className="home-intro">
        <div className="container">
          <div className="home-intro__panel">
            <div>
              <p className="section-kicker">2026 Season</p>
              <h1>第103回 東京リーグ</h1>
              <p>試合情報、ニュース、参加チーム、資料を既存サイトの雰囲気に寄せて整理したトップページです。</p>
            </div>
            <div className="home-intro__links">
              <Link href="/competitions" className="button">
                試合情報
              </Link>
              <Link href="/news" className="button button--ghost">
                ニュース
              </Link>
              <Link href="/teams" className="button button--ghost">
                参加チーム
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container home-grid">
          <article className="card">
            <div className="card__header">
              <div>
                <p className="section-kicker">Competition</p>
                <h2>試合情報</h2>
              </div>
              <Link href="/competitions">大会詳細へ</Link>
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
                <p>現行の結果画像を活かしつつ、リーグ別ページへ遷移できる導線を整理します。</p>
                <div className="mini-meta">
                  {divisionCards.map((division) => (
                    <span key={division.name}>
                      {division.name} / 最終更新 {division.updatedAt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="card">
            <div className="card__header">
              <div>
                <p className="section-kicker">News</p>
                <h2>最新ニュース</h2>
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
        </div>
      </section>

      <section className="section-block">
        <div className="container home-grid">
          <article className="card">
            <div className="card__header">
              <div>
                <p className="section-kicker">Teams</p>
                <h2>参加チーム紹介</h2>
              </div>
              <Link href="/teams">参加チーム一覧</Link>
            </div>
            <div className="team-feature">
              <div className="team-feature__image">
                <Image
                  src={siteAssets.featuredTeamPhoto}
                  alt="旭フットボールクラブ"
                  fill
                  sizes="(max-width: 960px) 100vw, 20vw"
                />
              </div>
              <div className="team-feature__copy">
                <h3>旭フットボールクラブ</h3>
                <p>現サイトのチーム写真とロゴを使い、紹介一覧を見やすく整理します。</p>
              </div>
            </div>
          </article>

          <article className="card card--download">
            <div className="card__header">
              <div>
                <p className="section-kicker">Download</p>
                <h2>資料ダウンロード</h2>
              </div>
              <Link href="/downloads">一覧へ</Link>
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
  );
}
