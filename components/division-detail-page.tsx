import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultImageLightbox } from "@/components/result-image-lightbox";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCompetitionCategory, type CompetitionCategorySlug } from "@/lib/competition-category";
import { getPublishedHistoricalStandings } from "@/lib/historical-results";
import { normalizeDivisionSlug } from "@/lib/league-slug";
import { prisma } from "@/lib/prisma";
import { e2eMockCompetition, isE2ETestMode } from "@/lib/test-mode";

export async function DivisionDetailPage({
  categorySlug,
  competitionSlug,
  divisionSlug,
}: {
  categorySlug: CompetitionCategorySlug;
  competitionSlug: string;
  divisionSlug: string;
}) {
  const category = getCompetitionCategory(categorySlug);
  const requestedDivisionSlug = decodeURIComponent(divisionSlug);
  const normalizedDivisionSlug = normalizeDivisionSlug(requestedDivisionSlug);
  const competition = isE2ETestMode() && competitionSlug === e2eMockCompetition.slug
    ? {
        ...e2eMockCompetition,
        divisions: e2eMockCompetition.divisions.filter((division) =>
          division.slug === divisionSlug || division.slug === normalizedDivisionSlug || division.name === requestedDivisionSlug,
        ),
      }
    : await prisma.competition.findUnique({
        where: { slug: competitionSlug },
        include: {
          season: true,
          divisions: {
            where: { OR: [{ slug: divisionSlug }, { slug: normalizedDivisionSlug }, { name: requestedDivisionSlug }] },
            include: {
              teams: { include: { team: true }, orderBy: { sortOrder: "asc" } },
              standings: { include: { team: true }, orderBy: { rank: "asc" } },
            },
          },
        },
      });
  const division = competition?.divisions[0];

  if (!category || !competition || !division || !category.competitionTypes.includes(competition.competitionType)) notFound();

  const resultImageSrc = division.resultImagePath;
  const logoTeams = division.teams.filter((assignment) => assignment.team.logoPath).slice(0, 8);
  const publishedStandings = getPublishedHistoricalStandings(resultImageSrc, division.standings);

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro"><div className="container page-intro__inner"><div>
          <p className="section-kicker">{competition.season.label} / {competition.name}</p>
          <h1>{division.name}</h1><p>{division.description || "所属チーム一覧と結果画像を掲載しています。"}</p>
          <div className="page-intro__actions">
            <Link href={`/competitions/${categorySlug}/${competition.slug}`} className="button button--ghost">大会詳細へ戻る</Link>
            {division.sourceUrl ? <a href={division.sourceUrl} target="_blank" rel="noreferrer" className="button">旧サイトを見る</a> : null}
          </div>
        </div>
        {logoTeams.length > 0 ? <div className="page-intro__visual division-logo-board"><div className="division-logo-board__grid">
          {logoTeams.map((assignment) => <div key={assignment.id} className="division-logo-board__item"><Image src={assignment.team.logoPath!} alt={assignment.team.name} fill sizes="(max-width: 960px) 25vw, 120px" /></div>)}
        </div></div> : null}
        </div></section>

        <section className="section-block"><div className="container competition-layout">
          <article className="card"><div className="card__header"><div><p className="section-kicker">Result</p><h2>試合結果画像</h2></div></div>
            {resultImageSrc ? <ResultImageLightbox src={resultImageSrc} alt={`${division.name} 試合結果画像`} /> : <p className="admin-muted">試合結果画像はまだ登録されていません。</p>}
          </article>
          <article className="card"><div className="card__header"><div><p className="section-kicker">Teams</p><h2>所属チーム</h2></div></div><div className="list-stack">
            {division.teams.map((assignment) => <article key={assignment.id} className="list-row division-team-row"><p className="list-row__meta"><span>{assignment.sortOrder}</span><span>{assignment.team.region || "東京"}</span></p><h3>{assignment.team.name}</h3></article>)}
          </div></article>
        </div></section>

        <section className="section-block"><div className="container home-grid"><article className="card"><div className="card__header"><div><p className="section-kicker">Standings</p><h2>順位表</h2></div></div>
          {publishedStandings.length > 0 ? <div className="standing-table"><div className="standing-table__row standing-table__row--head"><span>順位</span><span>チーム</span><span>試合</span><span>勝点</span><span>得失点</span></div>
            {publishedStandings.map((standing) => <div key={standing.id} className="standing-table__row"><strong>{standing.rank}</strong><span>{standing.team.name}</span><span>{standing.played}</span><span>{standing.points}</span><span>{standing.goalDifference}</span></div>)}
          </div> : <p className="admin-muted">公式結果は上の結果画像をご確認ください。</p>}
        </article></div></section>
      </main>
      <SiteFooter />
    </>
  );
}
