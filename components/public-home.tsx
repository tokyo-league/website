import Image from "next/image";
import Link from "next/link";
import { PublishStatus } from "@prisma/client";
import { NewsList } from "@/components/news-list";
import { prisma } from "@/lib/prisma";
import { getPublishedNews } from "@/lib/public-news";
import { siteAssets, teams as fallbackTeams } from "@/lib/site-data";
import { getTeamInitial, isDisplayableTeamLogo } from "@/lib/team-logo";

export async function PublicHome() {
  const latestNews = await getPublishedNews(3);
  const featuredTeams = await getRandomFeaturedTeams(3);

  return (
    <main className="page-main heritage-home">
      <section className="heritage-hero" aria-labelledby="home-hero-title">
        <Image src={siteAssets.homeHero} alt="東京リーグでプレーする選手たち" fill priority sizes="100vw" />
        <div className="heritage-hero__shade" />
        <div className="heritage-hero__brand">
          <p><span>TOKYO</span> Junior Soccer League</p>
          <div>
            <strong>東京リーグ</strong>
            <span>東京少年サッカー連盟</span>
          </div>
        </div>
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
        <NewsList items={latestNews} />
      </section>

      <section className="heritage-content heritage-teams">
        <div className="heritage-section-title">
          <div><p className="section-kicker">OUR TEAMS</p><h2>参加チーム</h2></div>
          <Link href="/teams">すべて見る <span>→</span></Link>
        </div>
        <div className="home-team-logo-grid">
          {featuredTeams.map((team) => (
            <article key={team.id} className="home-team-logo-card">
              <div className="home-team-logo-card__logo">
                {isDisplayableTeamLogo(team.logoPath) ? (
                  <Image src={team.logoPath!} alt={`${team.name} ロゴ`} width={112} height={112} />
                ) : (
                  <span aria-hidden="true">{getTeamInitial(team.name)}</span>
                )}
              </div>
              <div className="home-team-logo-card__copy">
                <p className="home-team-logo-card__region">{team.region || "東京都内"}</p>
                <p className="home-team-logo-card__name">{team.name}</p>
              </div>
            </article>
          ))}
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
        logoPath: true,
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
      logoPath: team.logo,
      sortOrder: index,
    }));
  }
}
