import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { e2eMockCompetition, isE2ETestMode } from "@/lib/test-mode";
import type { CompetitionCategorySlug } from "@/lib/competition-category";
import { competitionCategories } from "@/lib/competition-category";

export async function CompetitionCategoryArchive({ categorySlug }: { categorySlug: CompetitionCategorySlug }) {
  const category = competitionCategories[categorySlug];
  const competitions = isE2ETestMode()
    ? category.competitionTypes.includes(e2eMockCompetition.competitionType)
      ? [e2eMockCompetition]
      : []
    : await prisma.competition.findMany({
        where: { competitionType: { in: category.competitionTypes } },
        include: {
          season: true,
          divisions: {
            where: { status: "PUBLISHED" },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
        orderBy: [{ season: { year: "desc" } }, { edition: "desc" }, { createdAt: "desc" }],
      });

  const latestSeasonYear = competitions[0]?.season.year ?? null;
  const currentCompetitions = competitions.filter((competition) => competition.season.year === latestSeasonYear);
  const archiveGroups = new Map<number, Array<(typeof competitions)[number]>>();

  for (const competition of competitions) {
    if (competition.season.year === latestSeasonYear) continue;
    const list = archiveGroups.get(competition.season.year) ?? [];
    list.push(competition);
    archiveGroups.set(competition.season.year, list);
  }

  return (
    <>
      <section className="section-block">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Current</p>
              <h2>開催中の大会</h2>
            </div>
          </div>
          {currentCompetitions.length > 0 ? (
            <div className="competition-card-grid">
              {currentCompetitions.map((competition) => (
                <CompetitionCard key={competition.id} categorySlug={categorySlug} competition={competition} />
              ))}
            </div>
          ) : (
            <p className="admin-muted">現在公開中の大会情報は準備中です。</p>
          )}
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
          {archiveGroups.size > 0 ? (
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
                          <span>{competition.season.label}</span>
                          <span>{competition.divisions.length > 0 ? `${competition.divisions.length}リーグ` : "結果掲載"}</span>
                        </p>
                        <h3>{competition.name}</h3>
                        <p>{competition.summary || defaultCompetitionSummary(competition.competitionType)}</p>
                        <div className="page-intro__actions">
                          <Link href={`/competitions/${categorySlug}/${competition.slug}`} className="button button--ghost">
                            詳細を見る
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-muted">過去大会の情報は準備中です。</p>
          )}
        </div>
      </section>
    </>
  );
}

function CompetitionCard({
  categorySlug,
  competition,
}: {
  categorySlug: CompetitionCategorySlug;
  competition: {
    id: string;
    slug: string;
    name: string;
    summary: string | null;
    competitionType: "LEAGUE" | "CUP" | "OTHER";
    status: "DRAFT" | "PUBLISHED" | "CLOSED";
    divisions: Array<unknown>;
    season: { label: string };
  };
}) {
  return (
    <article className="card competition-card">
      <p className="section-kicker">{competition.season.label}</p>
      <h2>{competition.name}</h2>
      <p>{competition.summary || defaultCompetitionSummary(competition.competitionType)}</p>
      <div className="mini-meta">
        <span>{competition.competitionType === "LEAGUE" ? `${competition.divisions.length}リーグ` : "結果掲載"}</span>
        <span>{competition.status === "PUBLISHED" ? "公開中" : "アーカイブ"}</span>
      </div>
      <div className="page-intro__actions">
        <Link href={`/competitions/${categorySlug}/${competition.slug}`} className="button">
          大会詳細へ
        </Link>
      </div>
    </article>
  );
}

function defaultCompetitionSummary(type: "LEAGUE" | "CUP" | "OTHER") {
  if (type === "LEAGUE") return "リーグ別の結果画像、所属チーム、過去結果のアーカイブを確認できます。";
  if (type === "CUP") return "年ごとの決勝大会結果を画像または PDF で掲載しています。";
  return "大会情報を掲載しています。";
}
