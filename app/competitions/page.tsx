import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { siteAssets } from "@/lib/site-data";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const competitions = await prisma.competition.findMany({
    include: {
      season: true,
      divisions: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ season: { year: "desc" } }, { edition: "desc" }, { createdAt: "desc" }],
  });

  const latestSeasonYear = competitions[0]?.season.year ?? null;
  const currentCompetitions = competitions.filter((competition) => competition.season.year === latestSeasonYear);
  const archiveGroups = new Map<number, typeof competitions>();

  for (const competition of competitions) {
    const list = archiveGroups.get(competition.season.year) ?? [];
    list.push(competition);
    archiveGroups.set(competition.season.year, list);
  }

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">Competition</p>
              <h1>試合情報</h1>
              <p>開催中の大会と過去大会のアーカイブを、年度ごとに確認できる構成です。</p>
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
                alt="東京リーグの試合情報"
                fill
                sizes="(max-width: 960px) 100vw, 32vw"
              />
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Current</p>
                <h2>開催中の大会</h2>
              </div>
            </div>
            <div className="competition-card-grid">
              {currentCompetitions.map((competition) => (
                <article key={competition.id} className="card competition-card">
                  <p className="section-kicker">{competition.season.label}</p>
                  <h2>{competition.name}</h2>
                  <p>{competition.summary || defaultCompetitionSummary(competition.competitionType)}</p>
                  <div className="mini-meta">
                    <span>{competition.competitionType === "LEAGUE" ? `${competition.divisions.length}リーグ` : "結果掲載"}</span>
                    <span>{competition.status === "PUBLISHED" ? "公開中" : "アーカイブ"}</span>
                  </div>
                  <div className="page-intro__actions">
                    <Link href={`/competitions/${competition.slug}`} className="button">
                      大会詳細へ
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Archive</p>
                <h2>過去大会アーカイブ</h2>
              </div>
            </div>
            <div className="archive-stack">
              {[...archiveGroups.entries()].map(([year, items]) => (
                <article key={year} className="card">
                  <div className="card__header">
                    <div>
                      <p className="section-kicker">Season</p>
                      <h2>{year}年度</h2>
                    </div>
                  </div>
                  <div className="list-stack">
                    {items.map((competition) => (
                      <article key={competition.id} className="list-row list-row--large">
                        <p className="list-row__meta">
                          <span>{competition.competitionType === "LEAGUE" ? "東京リーグ" : "5年生FES 山藤杯"}</span>
                          <span>{competition.divisions.length > 0 ? `${competition.divisions.length}リーグ` : "結果掲載"}</span>
                        </p>
                        <h3>{competition.name}</h3>
                        <p>{competition.summary || defaultCompetitionSummary(competition.competitionType)}</p>
                        <div className="page-intro__actions">
                          <Link href={`/competitions/${competition.slug}`} className="button button--ghost">
                            詳細を見る
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function defaultCompetitionSummary(type: "LEAGUE" | "CUP" | "OTHER") {
  if (type === "LEAGUE") {
    return "リーグ別の結果画像、所属チーム、過去結果のアーカイブを確認できます。";
  }

  if (type === "CUP") {
    return "年ごとの決勝大会結果を画像または PDF で掲載しています。";
  }

  return "大会情報を掲載しています。";
}
