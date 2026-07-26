import { DivisionDetailPage } from "@/components/division-detail-page";
import { getCompetitionCategory } from "@/lib/competition-category";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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
