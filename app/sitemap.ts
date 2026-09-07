import type { MetadataRoute } from "next";
import { CompetitionStatus, PublishStatus } from "@prisma/client";
import { getCompetitionCategorySlug } from "@/lib/competition-category";
import { prisma } from "@/lib/prisma";
import { getAbsoluteUrl } from "@/lib/site-seo";

const staticPages = [
  { path: "/", changeFrequency: "daily" as const, priority: 1 },
  { path: "/competitions", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/competitions/tokyo-league", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/competitions/sando-cup", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/news", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/teams", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/downloads", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/teams/important", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/teams/important/heat-safety", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/teams/important/match-standards", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!getAbsoluteUrl("/")) return [];

  const entries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: getAbsoluteUrl(page.path)!,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const [posts, competitions] = await Promise.all([
      prisma.newsPost.findMany({
        where: { status: PublishStatus.PUBLISHED },
        select: { slug: true, updatedAt: true, publishedAt: true },
      }),
      prisma.competition.findMany({
        where: { status: { in: [CompetitionStatus.PUBLISHED, CompetitionStatus.CLOSED] } },
        select: {
          slug: true,
          competitionType: true,
          updatedAt: true,
          divisions: { where: { status: PublishStatus.PUBLISHED }, select: { slug: true, updatedAt: true } },
        },
      }),
    ]);

    posts.forEach((post) => entries.push({
      url: getAbsoluteUrl(`/news/${post.slug}`)!,
      lastModified: post.updatedAt ?? post.publishedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    competitions.forEach((competition) => {
      const categorySlug = getCompetitionCategorySlug(competition.competitionType);
      if (!categorySlug) return;

      entries.push({
        url: getAbsoluteUrl(`/competitions/${categorySlug}/${competition.slug}`)!,
        lastModified: competition.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
      competition.divisions.forEach((division) => entries.push({
        url: getAbsoluteUrl(`/competitions/${categorySlug}/${competition.slug}/${division.slug}`)!,
        lastModified: division.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      }));
    });
  } catch {
    // Keep static URLs available if the database is temporarily unreachable.
  }

  return entries;
}
