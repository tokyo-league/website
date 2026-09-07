import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompetitionDetailPage } from "@/components/competition-detail-page";
import { getCompetitionCategory, getCompetitionCategorySlug } from "@/lib/competition-category";
import { prisma } from "@/lib/prisma";
import { e2eMockCompetition, isE2ETestMode } from "@/lib/test-mode";
import { createPageMetadata } from "@/lib/site-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ competitionSlug: string; divisionSlug: string }> }): Promise<Metadata> {
  const { competitionSlug: categorySlug, divisionSlug: competitionSlug } = await params;
  const category = getCompetitionCategory(categorySlug);
  if (!category) return { robots: { index: false, follow: false } };

  const competition = await prisma.competition.findUnique({
    where: { slug: competitionSlug },
    select: { name: true, summary: true, competitionType: true, status: true },
  }).catch(() => null);
  if (!competition || !category.competitionTypes.includes(competition.competitionType) || competition.status === "DRAFT") {
    return { robots: { index: false, follow: false } };
  }

  return createPageMetadata({
    title: competition.name,
    description: competition.summary || `${competition.name}の試合結果、リーグ別の所属チーム、順位表を掲載しています。`,
    path: `/competitions/${category.slug}/${competitionSlug}`,
    keywords: [category.name, "試合結果", "順位表"],
  });
}

export default async function CompetitionDetailRoute({
  params,
}: {
  params: Promise<{ competitionSlug: string; divisionSlug: string }>;
}) {
  const { competitionSlug, divisionSlug } = await params;
  const category = getCompetitionCategory(competitionSlug);

  if (category) return <CompetitionDetailPage categorySlug={category.slug} competitionSlug={divisionSlug} />;

  const competition = isE2ETestMode() && competitionSlug === e2eMockCompetition.slug
    ? e2eMockCompetition
    : await prisma.competition.findUnique({ where: { slug: competitionSlug }, select: { competitionType: true } });
  const categorySlug = competition ? getCompetitionCategorySlug(competition.competitionType) : null;

  if (!categorySlug) notFound();
  redirect(`/competitions/${categorySlug}/${competitionSlug}/${divisionSlug}`);
}
