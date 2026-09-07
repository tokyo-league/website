import type { Metadata } from "next";
import { DivisionDetailPage } from "@/components/division-detail-page";
import { getCompetitionCategory } from "@/lib/competition-category";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/site-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ competitionSlug: string; divisionSlug: string; leagueSlug: string }> }): Promise<Metadata> {
  const { competitionSlug: categorySlug, divisionSlug: competitionSlug, leagueSlug: divisionSlug } = await params;
  const category = getCompetitionCategory(categorySlug);
  if (!category) return { robots: { index: false, follow: false } };

  const competition = await prisma.competition.findUnique({
    where: { slug: competitionSlug },
    select: {
      name: true,
      competitionType: true,
      status: true,
      divisions: { where: { slug: divisionSlug }, select: { name: true, description: true, status: true } },
    },
  }).catch(() => null);
  const division = competition?.divisions[0];
  if (!competition || !division || !category.competitionTypes.includes(competition.competitionType) || competition.status === "DRAFT" || division.status !== "PUBLISHED") {
    return { robots: { index: false, follow: false } };
  }

  return createPageMetadata({
    title: `${competition.name} ${division.name}`,
    description: division.description || `${competition.name} ${division.name}の試合結果、所属チーム、順位表を掲載しています。`,
    path: `/competitions/${category.slug}/${competitionSlug}/${divisionSlug}`,
    keywords: [category.name, competition.name, division.name, "順位表"],
  });
}

export default async function DivisionDetailRoute({
  params,
}: {
  params: Promise<{ competitionSlug: string; divisionSlug: string; leagueSlug: string }>;
}) {
  const { competitionSlug: categorySlug, divisionSlug: competitionSlug, leagueSlug: divisionSlug } = await params;
  const category = getCompetitionCategory(categorySlug);
  if (!category) notFound();
  return <DivisionDetailPage categorySlug={category.slug} competitionSlug={competitionSlug} divisionSlug={divisionSlug} />;
}
