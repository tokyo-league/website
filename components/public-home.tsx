import Image from "next/image";
import Link from "next/link";
import { divisionCards, newsItems } from "@/lib/site-data";

export function PublicHome() {
  return (
    <main>
      <section className="home-hero">
        <div className="container home-hero__inner">
          <div className="home-hero__copy">
            <p className="section-kicker">2026 Season</p>
            <h1>試合結果と最新情報を、最短距離で。</h1>
            <p>
              現行サイトのミニマルなテイストは残しつつ、ニュースと試合結果を上部に集約した公開トップを想定しています。
            </p>
            <div className="button-row">
              <Link href="/competitions" className="button">
                試合結果を見る
              </Link>
              <Link href="/news" className="button button--ghost">
                ニュース一覧
              </Link>
            </div>
          </div>
          <div className="home-hero__visual">
            <Image
              src="https://tokyo-league.jp/wp-content/uploads/2022/10/A%E3%83%AA%E3%83%BC%E3%82%B0-3.jpg"
              alt="東京リーグの試合結果画像"
              fill
              sizes="(max-width: 960px) 100vw, 42vw"
            />
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container home-grid">
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
                  src="https://tokyo-league.jp/wp-content/uploads/2019/09/17%E4%B8%8A%E6%AE%B5_%E6%97%AD%E3%83%95%E3%83%83%E3%83%88%E3%83%9C%E3%83%BC%E3%83%AB%E3%82%AF%E3%83%A9%E3%83%96.jpg"
                  alt="旭フットボールクラブ"
                  fill
                  sizes="(max-width: 960px) 100vw, 20vw"
                />
              </div>
              <div className="team-feature__copy">
                <h3>旭フットボールクラブ</h3>
                <p>
                  現サイトのチーム写真を活かしながら、一覧性の高いカード表示に再構成します。
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="section-block section-block--muted">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Competition</p>
              <h2>第103回 東京リーグ</h2>
            </div>
            <Link href="/competitions">大会詳細へ</Link>
          </div>
          <div className="division-grid">
            {divisionCards.map((division) => (
              <article key={division.name} className="division-card">
                <h3>{division.name}</h3>
                <p>参加 {division.teams}</p>
                <span>最終更新 {division.updatedAt}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
