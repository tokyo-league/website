import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompetitionCategoryArchive } from "@/components/competition-category-archive";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCompetitionCategory, getCompetitionCategorySlug } from "@/lib/competition-category";
import { prisma } from "@/lib/prisma";
import { siteAssets } from "@/lib/site-data";
import { e2eMockCompetition, isE2ETestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

export default async function CompetitionRoutePage({ params }: { params: Promise<{ competitionSlug: string }> }) {
  const { competitionSlug } = await params;
  const category = getCompetitionCategory(competitionSlug);

  if (category) {
    return (
      <>
        <SiteHeader />
        <main className="page-main">
          <section className="page-intro page-intro--feature">
            <div className="container page-intro__inner">
              <div>
                <p className="section-kicker">{category.kicker}</p>
                <h1>{category.name}</h1>
                <p>{category.description}</p>
                <div className="page-intro__actions"><Link href="/competitions" className="button button--ghost">大会一覧へ</Link></div>
              </div>
              <div className="page-intro__visual page-intro__visual--feature">
                <Image src={siteAssets.competitionMainVisual} alt={`${category.name}の試合情報`} fill sizes="100vw" />
                <div className="page-intro__visual-caption"><span>{category.kicker}</span><strong>{category.name}</strong></div>
              </div>
            </div>
          </section>
          <CompetitionCategoryArchive categorySlug={category.slug} />
        </main>
        <SiteFooter />
      </>
    );
  }

  const competition = isE2ETestMode() && competitionSlug === e2eMockCompetition.slug
    ? e2eMockCompetition
    : await prisma.competition.findUnique({ where: { slug: competitionSlug }, select: { competitionType: true } });
  const categorySlug = competition ? getCompetitionCategorySlug(competition.competitionType) : null;

  if (!categorySlug) notFound();
  redirect(`/competitions/${categorySlug}/${competitionSlug}`);
}
