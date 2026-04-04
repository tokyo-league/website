import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { siteAssets } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ competitionSlug: string }>;
}) {
  const { competitionSlug } = await params;
  const competition = await prisma.competition.findUnique({
    where: { slug: competitionSlug },
    include: {
      season: true,
      divisions: {
        include: {
          teams: {
            include: {
              team: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!competition) {
    notFound();
  }

  const heroImage =
    competition.competitionType === "LEAGUE"
      ? competition.divisions.find((division) => division.resultImagePath)?.resultImagePath || siteAssets.heroResult
      : siteAssets.competitionHero;
  const isImageResult = Boolean(competition.resultFilePath?.match(/\.(png|jpe?g|webp)$/i));

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">{competition.season.label}</p>
              <h1>{competition.name}</h1>
              <p>{competition.summary || defaultCompetitionSummary(competition.competitionType)}</p>
              <div className="mini-meta">
                <span>{competition.competitionType === "LEAGUE" ? `${competition.divisions.length}リーグ` : "決勝大会結果"}</span>
                <span>{competition.status === "PUBLISHED" ? "公開中" : "アーカイブ"}</span>
              </div>
              <div className="page-intro__actions">
                <Link href="/competitions" className="button button--ghost">
                  試合情報一覧へ
                </Link>
                {competition.sourceUrl ? (
                  <a href={competition.sourceUrl} target="_blank" rel="noreferrer" className="button">
                    旧サイトを見る
                  </a>
                ) : null}
              </div>
            </div>
            <div className="page-intro__visual">
              <Image src={heroImage} alt={competition.name} fill sizes="(max-width: 960px) 100vw, 32vw" />
            </div>
          </div>
        </section>

        {competition.competitionType === "LEAGUE" ? (
          <section className="section-block">
            <div className="container">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Divisions</p>
                  <h2>リーグ一覧</h2>
                </div>
              </div>
              <div className="competition-card-grid">
                {competition.divisions.map((division) => (
                  <article key={division.id} className="card competition-card">
                    <p className="section-kicker">{competition.name}</p>
                    <h2>{division.name}</h2>
                    <p>{division.teams.length > 0 ? `所属 ${division.teams.length}チーム` : "所属チーム情報を準備中です。"}</p>
                    <div className="mini-meta">
                      {division.resultImagePath ? <span>結果画像あり</span> : null}
                      <span>{division.status === "PUBLISHED" ? "公開" : "非公開"}</span>
                    </div>
                    <div className="page-intro__actions">
                      <Link href={`/competitions/${competition.slug}/${division.slug}`} className="button">
                        リーグ結果を見る
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="section-block">
            <div className="container narrow">
              <article className="card card--download">
                <div className="card__header">
                  <div>
                    <p className="section-kicker">Result</p>
                    <h2>決勝大会結果</h2>
                  </div>
                </div>
                <p>{competition.resultFilePath ? "結果ファイルを掲載しています。" : "結果ファイルは準備中です。"}</p>
                {competition.resultFilePath ? (
                  <>
                    {isImageResult ? (
                      <div className="result-feature__image result-feature__image--large">
                        <Image
                          src={competition.resultFilePath}
                          alt={`${competition.name} 結果画像`}
                          fill
                          sizes="(max-width: 960px) 100vw, 800px"
                        />
                      </div>
                    ) : null}
                    <div className="page-intro__actions">
                      <a href={competition.resultFilePath} target="_blank" rel="noreferrer" className="button">
                        結果を見る
                      </a>
                    </div>
                  </>
                ) : null}
              </article>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function defaultCompetitionSummary(type: "LEAGUE" | "CUP" | "OTHER") {
  if (type === "LEAGUE") {
    return "リーグ別の試合結果画像と所属チームを確認できます。";
  }

  if (type === "CUP") {
    return "年ごとの決勝大会結果を画像または PDF で掲載しています。";
  }

  return "大会情報を掲載しています。";
}
