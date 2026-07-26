import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeagueTeamPopup } from "@/components/league-team-popup";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCompetitionCategory, type CompetitionCategorySlug } from "@/lib/competition-category";
import { normalizeDivisionSlug } from "@/lib/league-slug";
import { prisma } from "@/lib/prisma";
import { siteAssets } from "@/lib/site-data";
import { e2eMockCompetition, isE2ETestMode } from "@/lib/test-mode";

export async function CompetitionDetailPage({
  categorySlug,
  competitionSlug,
}: {
  categorySlug: CompetitionCategorySlug;
  competitionSlug: string;
}) {
  const category = getCompetitionCategory(categorySlug);
  const competition = isE2ETestMode() && competitionSlug === e2eMockCompetition.slug
    ? e2eMockCompetition
    : await prisma.competition.findUnique({
        where: { slug: competitionSlug },
        include: {
          season: true,
          divisions: {
            include: { teams: { include: { team: true }, orderBy: { sortOrder: "asc" } } },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
      });

  if (!category || !competition || !category.competitionTypes.includes(competition.competitionType)) notFound();

  const isImageResult = Boolean(competition.resultFilePath?.match(/\.(png|jpe?g|webp)$/i));
  const sortedDivisions = [...competition.divisions].sort(compareDivisions);

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--feature">
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
                <Link href={`/competitions/${categorySlug}`} className="button button--ghost">{category.name}一覧へ</Link>
                {competition.sourceUrl ? <a href={competition.sourceUrl} target="_blank" rel="noreferrer" className="button">旧サイトを見る</a> : null}
              </div>
            </div>
            <div className="page-intro__visual page-intro__visual--feature">
              <Image src={siteAssets.competitionMainVisual} alt={competition.name} fill sizes="100vw" />
              <div className="page-intro__visual-caption"><span>{category.kicker}</span><strong>試合情報</strong></div>
            </div>
          </div>
        </section>

        {competition.competitionType === "LEAGUE" ? (
          <section className="section-block"><div className="container">
            <div className="section-heading"><div><p className="section-kicker">Divisions</p><h2>リーグ一覧</h2></div></div>
            <div className="competition-card-grid">
              {sortedDivisions.map((division) => (
                <article key={division.id} className="card competition-card">
                  <p className="section-kicker">{competition.name}</p><h2>{division.name}</h2>
                  {division.teams.length > 0 ? <LeagueTeamPopup divisionName={division.name} teams={division.teams.map(({ team }) => ({ id: team.id, name: team.name, region: team.region }))} /> : <p>所属チーム情報を準備中です。</p>}
                  <div className="mini-meta">{division.resultImagePath ? <span>結果画像あり</span> : null}<span>{division.status === "PUBLISHED" ? "公開" : "非公開"}</span></div>
                  <div className="page-intro__actions"><Link href={`/competitions/${categorySlug}/${competition.slug}/${division.slug}`} className="button">リーグ結果を見る</Link></div>
                </article>
              ))}
            </div>
          </div></section>
        ) : (
          <section className="section-block"><div className="container narrow"><article className="card card--download">
            <div className="card__header"><div><p className="section-kicker">Result</p><h2>決勝大会結果</h2></div></div>
            <p>{competition.resultFilePath ? "結果ファイルを掲載しています。" : "結果ファイルは準備中です。"}</p>
            {competition.resultFilePath ? <>{isImageResult ? <div className="result-feature__image result-feature__image--large"><Image src={competition.resultFilePath} alt={`${competition.name} 結果画像`} fill sizes="(max-width: 960px) 100vw, 800px" /></div> : null}<div className="page-intro__actions"><a href={competition.resultFilePath} target="_blank" rel="noreferrer" className="button">結果を見る</a></div></> : null}
          </article></div></section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function defaultCompetitionSummary(type: "LEAGUE" | "CUP" | "OTHER") {
  if (type === "LEAGUE") return "リーグ別の試合結果画像と所属チームを確認できます。";
  if (type === "CUP") return "年ごとの決勝大会結果を画像または PDF で掲載しています。";
  return "大会情報を掲載しています。";
}

function compareDivisions(a: { name: string; slug: string; sortOrder: number }, b: { name: string; slug: string; sortOrder: number }) {
  const aRank = getDivisionRank(a);
  const bRank = getDivisionRank(b);
  if (aRank !== bRank) return aRank - bRank;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, "ja");
}

function getDivisionRank(division: { name: string; slug: string }) {
  const match = normalizeDivisionSlug(division.slug || division.name).match(/^([a-z])/i);
  return match ? match[1].toUpperCase().charCodeAt(0) - 65 : Number.MAX_SAFE_INTEGER;
}
