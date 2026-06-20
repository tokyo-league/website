import Image from "next/image";
import Link from "next/link";
import { PublishStatus } from "@prisma/client";
import { NewsModalList } from "@/components/news-modal-list";
import { resolveAssetUrl } from "@/lib/asset-url";
import { buildNewsExcerpt } from "@/lib/news-text";
import { prisma } from "@/lib/prisma";
import { newsItems as fallbackNewsItems, siteAssets, teams as fallbackTeams } from "@/lib/site-data";

export async function PublicHome() {
  const latestNews = await getLatestNews(3);
  const featuredTeams = await getRandomFeaturedTeams(3);

  return (
    <main className="page-main heritage-home">
      <section className="heritage-hero" aria-labelledby="home-hero-title">
        <Image src={siteAssets.homeHero} alt="東京リーグでプレーする選手たち" fill priority sizes="100vw" />
        <div className="heritage-hero__shade" />
        <div className="heritage-hero__copy">
          <p>EST. 1982 / TOKYO</p>
          <h1 id="home-hero-title">受け継ぐ誇りを、<br />未来へ。</h1>
          <span>Together, we shape the next generation.</span>
        </div>
        <div className="heritage-hero__side" aria-hidden="true"><b>01</b><span>SCROLL TO DISCOVER</span></div>
      </section>

      <section className="heritage-intro">
        <div className="heritage-intro__label"><p className="section-kicker">OUR LEAGUE</p><span /></div>
        <div>
          <h2>サッカーを通じて、<br />強く、正しく、たくましく。</h2>
          <p>東京リーグは、少年少女たちが真剣勝負の中で成長し、仲間とともに未来を切り拓くための舞台です。長い歴史を受け継ぎながら、次の一歩をつくります。</p>
          <Link href="/about" className="heritage-text-link">東京リーグについて <span>→</span></Link>
        </div>
      </section>

      <section className="heritage-feature">
        <div className="heritage-feature__copy">
          <p className="section-kicker">LATEST COMPETITION</p>
          <h2>第103回<br />東京リーグ</h2>
          <p>2026 SEASON</p>
          <Link href="/competitions" className="heritage-text-link">大会情報を見る <span>↗</span></Link>
        </div>
        <div className="heritage-feature__image">
          <Image src={siteAssets.competitionMainVisual} alt="試合中の選手たち" fill sizes="(max-width: 900px) 100vw, 60vw" />
          <span>PLAY WITH PRIDE</span>
        </div>
        <div className="heritage-feature__data">
          <div><small>DIVISIONS</small><strong>7</strong></div>
          <div><small>TEAMS</small><strong>88</strong></div>
          <div><small>SEASON</small><strong>103</strong></div>
        </div>
      </section>

      <section className="heritage-content heritage-news">
        <div className="heritage-section-title">
          <div><p className="section-kicker">JOURNAL</p><h2>最新情報</h2></div>
          <Link href="/news">すべて見る <span>→</span></Link>
        </div>
        <NewsModalList items={latestNews} />
      </section>

      <section className="heritage-content heritage-teams">
        <div className="heritage-section-title">
          <div><p className="section-kicker">OUR TEAMS</p><h2>参加チーム</h2></div>
          <Link href="/teams">すべて見る <span>→</span></Link>
        </div>
        <div className="home-team-grid">
          {featuredTeams.map((team) => (
            <article key={team.id} className="home-team-card">
              <div className="home-team-card__image">
                <Image src={team.photoPath || siteAssets.teamsHero} alt={team.name} fill sizes="(max-width: 720px) 100vw, 33vw" />
              </div>
              <div className="home-team-card__copy">
                <p>{team.region || "東京都内"}</p>
                <p className="home-team-card__title">{team.name}</p>
              </div>
            </article>
          ))}
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
