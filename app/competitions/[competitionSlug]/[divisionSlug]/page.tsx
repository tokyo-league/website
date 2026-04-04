import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { siteAssets } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function DivisionDetailPage({
  params,
}: {
  params: Promise<{ competitionSlug: string; divisionSlug: string }>;
}) {
  const { competitionSlug, divisionSlug } = await params;
  const competition = await prisma.competition.findUnique({
    where: { slug: competitionSlug },
    include: {
      season: true,
      divisions: {
        where: { slug: divisionSlug },
        include: {
          teams: {
            include: {
              team: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  const division = competition?.divisions[0];

  if (!competition || !division) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">
                {competition.season.label} / {competition.name}
              </p>
              <h1>{division.name}</h1>
              <p>{division.description || "所属チーム一覧と結果画像を掲載しています。"}</p>
              <div className="page-intro__actions">
                <Link href={`/competitions/${competition.slug}`} className="button button--ghost">
                  大会詳細へ戻る
                </Link>
                {division.sourceUrl ? (
                  <a href={division.sourceUrl} target="_blank" rel="noreferrer" className="button">
                    旧サイトを見る
                  </a>
                ) : null}
              </div>
            </div>
            <div className="page-intro__visual">
              <Image
                src={division.resultImagePath || siteAssets.heroResult}
                alt={`${division.name} 試合結果`}
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
                  <p className="section-kicker">Result</p>
                  <h2>試合結果画像</h2>
                </div>
              </div>
              <div className="result-feature__image result-feature__image--large">
                <Image
                  src={division.resultImagePath || siteAssets.heroResult}
                  alt={`${division.name} 試合結果画像`}
                  fill
                  sizes="(max-width: 960px) 100vw, 60vw"
                />
              </div>
            </article>

            <article className="card">
              <div className="card__header">
                <div>
                  <p className="section-kicker">Teams</p>
                  <h2>所属チーム</h2>
                </div>
              </div>
              <div className="list-stack">
                {division.teams.map((assignment) => (
                  <article key={assignment.id} className="list-row">
                    <p className="list-row__meta">
                      <span>{assignment.sortOrder}</span>
                      <span>{assignment.team.region || "東京"}</span>
                    </p>
                    <h3>{assignment.team.name}</h3>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
