import Image from "next/image";
import Link from "next/link";
import { PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { divisionCards, newsItems, siteAssets, teams as fallbackTeams } from "@/lib/site-data";

export async function PublicHome() {
  const featuredTeams = await getRandomFeaturedTeams(3);

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
            {featuredTeams.length > 0 ? (
              <div className="home-team-grid">
                {featuredTeams.map((team) => (
                  <article key={team.id} className="home-team-card">
                    <div className="home-team-card__image">
                      <Image
                        src={team.photoPath || siteAssets.teamsHero}
                        alt={team.name}
                        fill
                        sizes="(max-width: 960px) 100vw, 33vw"
                      />
                    </div>
                    <div className="home-team-card__copy">
                      <h3>{team.name}</h3>
                      <p>{team.region || "東京都内"}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="home-team-grid">
                <article className="home-team-card">
                  <div className="home-team-card__image">
                    <Image
                      src={siteAssets.featuredTeamPhoto}
                      alt="参加チーム紹介"
                      fill
                      sizes="(max-width: 960px) 100vw, 33vw"
                    />
                  </div>
                  <div className="home-team-card__copy">
                    <h3>参加チーム紹介</h3>
                    <p>東京都内</p>
                  </div>
                </article>
                <article className="home-team-card">
                  <div className="home-team-card__image">
                    <Image
                      src={siteAssets.teamsHero}
                      alt="参加チーム紹介"
                      fill
                      sizes="(max-width: 960px) 100vw, 33vw"
                    />
                  </div>
                  <div className="home-team-card__copy">
                    <h3>参加チーム紹介</h3>
                    <p>東京都内</p>
                  </div>
                </article>
                <article className="home-team-card">
                  <div className="home-team-card__image">
                  <Image
                    src={siteAssets.heroResult}
                    alt="参加チーム紹介"
                    fill
                    sizes="(max-width: 960px) 100vw, 33vw"
                  />
                  </div>
                  <div className="home-team-card__copy">
                    <h3>参加チーム紹介</h3>
                    <p>東京都内</p>
                  </div>
                </article>
              </div>
            )}
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

async function getRandomFeaturedTeams(limit: number) {
  try {
    const teams = await prisma.team.findMany({
      where: {
        status: PublishStatus.PUBLISHED,
      },
      select: {
        id: true,
        name: true,
        region: true,
        photoPath: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return [...teams]
      .map((team) => ({ team, sortKey: Math.random() }))
      .sort((left, right) => left.sortKey - right.sortKey)
      .slice(0, limit)
      .map(({ team }) => team);
  } catch {
    return fallbackTeams.slice(0, limit).map((team, index) => ({
      id: `fallback-${index + 1}`,
      name: team.name,
      region: team.area,
      photoPath: team.image,
      sortOrder: index,
    }));
  }
}
