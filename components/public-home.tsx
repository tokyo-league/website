import Image from "next/image";
import Link from "next/link";
import { PublishStatus } from "@prisma/client";
import { NewsModalList } from "@/components/news-modal-list";
import { resolveAssetUrl } from "@/lib/asset-url";
import { buildNewsExcerpt } from "@/lib/news-text";
import { prisma } from "@/lib/prisma";
import { divisionCards, newsItems as fallbackNewsItems, siteAssets, teams as fallbackTeams } from "@/lib/site-data";

export async function PublicHome() {
  const latestNews = await getLatestNews(3);
  const featuredTeams = await getRandomFeaturedTeams(3);

  return (
    <main className="page-main">
      <section className="home-hero">
        <div className="container">
          <div className="home-hero__panel">
            <div className="home-hero__content">
              <div className="home-hero__title-block">
                <p className="section-kicker">TOKYO Junior Soccer League</p>
                <h1>第103回 東京リーグ</h1>
                <p className="home-hero__lead">
                  東京少年サッカー連盟 東京リーグの試合情報、ニュース、参加チーム情報を掲載しています。
                </p>
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
              <article className="home-about-link-card">
                <div>
                  <p className="section-kicker">About</p>
                  <h2>東京リーグについて</h2>
                  <p>組織概要、規約、運営方針などの基本情報をまとめています。</p>
                </div>
                <Link href="/about" className="button button--ghost">
                  説明を見る
                </Link>
              </article>
            </div>
            <div className="home-hero__media">
              <Image
                src={siteAssets.competitionMainVisual}
                alt="東京リーグ メインビジュアル"
                fill
                sizes="(max-width: 960px) 100vw, 52vw"
              />
              <div className="home-hero__media-caption">
                <span>Tokyo League</span>
                <strong>Match & News</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container home-primary-layout">
          <article className="card home-news-card">
            <div className="card__header">
              <div>
                <p className="section-kicker">News</p>
                <h2>最新ニュース</h2>
              </div>
              <Link href="/news">一覧へ</Link>
            </div>
            <NewsModalList items={latestNews} />
          </article>

          <article className="card home-results-card">
            <div className="card__header">
              <div>
                <p className="section-kicker">Competition</p>
                <h2>試合結果</h2>
              </div>
              <Link href="/competitions">大会詳細へ</Link>
            </div>
            <div className="home-results-feature">
              <div className="home-results-feature__image">
                <Image
                  src={siteAssets.heroResult}
                  alt="東京リーグの試合結果"
                  fill
                  sizes="(max-width: 960px) 100vw, 42vw"
                />
              </div>
              <div className="home-results-feature__body">
                <p className="home-results-feature__eyebrow">開催中のリーグ結果</p>
                <p className="home-results-feature__title">最新の試合結果や各チームの勝敗を確認できます。</p>
                <div className="home-results-division-links" aria-label="リーグ別の試合結果">
                  {divisionCards.map((division) => (
                    <Link key={division.name} href={division.href} className="home-results-division-link">
                      <strong>{division.name}を見る</strong>
                      <span>更新 {division.updatedAt}</span>
                    </Link>
                  ))}
                </div>
                <div className="button-row home-results-feature__actions">
                  <Link href="/competitions" className="button">
                    試合結果を見る
                  </Link>
                  <Link href="/downloads" className="button button--ghost">
                    要項を見る
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="container text-section-stack">
          <article className="card home-teams-card">
            <div className="card__header">
              <div>
                <p className="section-kicker">Teams</p>
                <h2>参加チーム紹介</h2>
              </div>
              <Link href="/teams" className="button button--ghost home-section-link-button">
                参加チーム一覧
              </Link>
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
                      <p className="home-team-card__title">{team.name}</p>
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
                    <p className="home-team-card__title">参加チーム紹介</p>
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
                    <p className="home-team-card__title">参加チーム紹介</p>
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
                    <p className="home-team-card__title">参加チーム紹介</p>
                    <p>東京都内</p>
                  </div>
                </article>
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}

async function getLatestNews(limit: number) {
  try {
    const posts = await prisma.newsPost.findMany({
      where: {
        status: PublishStatus.PUBLISHED,
      },
      include: {
        category: true,
        eyecatchAsset: {
          select: {
            storageKey: true,
          },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return Promise.all(posts.map(async (post) => ({
      id: post.id,
      title: post.title,
      excerpt: buildNewsExcerpt(post.body, 96),
      body: post.body,
      publishedAtLabel: formatDate(post.publishedAt),
      categoryName: "お知らせ",
      imageUrl: await resolveAssetUrl(post.eyecatchAsset?.storageKey),
    })));
  } catch {
    return fallbackNewsItems.slice(0, limit).map((item, index) => ({
      id: `fallback-news-${index + 1}`,
      title: item.title,
      excerpt: buildNewsExcerpt(item.excerpt, 96),
      body: item.excerpt,
      publishedAtLabel: item.date,
      categoryName: item.category,
      imageUrl: null,
    }));
  }
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

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}
