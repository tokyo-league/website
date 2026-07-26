import { notFound, redirect } from "next/navigation";
import { CompetitionDetailPage } from "@/components/competition-detail-page";
import { getCompetitionCategory, getCompetitionCategorySlug } from "@/lib/competition-category";
import { prisma } from "@/lib/prisma";
import { e2eMockCompetition, isE2ETestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

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
