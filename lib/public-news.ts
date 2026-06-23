import { cache } from "react";
import { PublishStatus } from "@prisma/client";
import { resolveAssetUrl } from "@/lib/asset-url";
import { buildNewsExcerpt } from "@/lib/news-text";
import { prisma } from "@/lib/prisma";
import { newsItems as fallbackNewsItems } from "@/lib/site-data";

export type PublicNewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  publishedAtLabel: string;
  categoryName: string;
  imageUrl: string | null;
  bodyImageUrls: string[];
};

export async function getPublishedNews(limit?: number): Promise<PublicNewsItem[]> {
  try {
    const posts = await prisma.newsPost.findMany({
      where: { status: PublishStatus.PUBLISHED },
      include: {
        category: true,
        eyecatchAsset: { select: { storageKey: true } },
        bodyImages: {
          orderBy: { sortOrder: "asc" },
          select: { asset: { select: { storageKey: true } } },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return Promise.all(
      posts.map(async (post) => {
        const bodyImageUrls = await Promise.all(
          post.bodyImages.map((image) => resolveAssetUrl(image.asset.storageKey)),
        );

        return {
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: buildNewsExcerpt(post.excerpt || post.body, 120),
          body: post.body,
          publishedAtLabel: formatNewsDate(post.publishedAt),
          categoryName: post.category?.name || "お知らせ",
          imageUrl: await resolveAssetUrl(post.eyecatchAsset?.storageKey),
          bodyImageUrls: bodyImageUrls.filter((url): url is string => Boolean(url)),
        };
      }),
    );
  } catch {
    return buildFallbackNews().slice(0, limit);
  }
}

export const getPublishedNewsBySlug = cache(async (slug: string): Promise<PublicNewsItem | null> => {
  try {
    const post = await prisma.newsPost.findFirst({
      where: { slug, status: PublishStatus.PUBLISHED },
      include: {
        category: true,
        eyecatchAsset: { select: { storageKey: true } },
        bodyImages: {
          orderBy: { sortOrder: "asc" },
          select: { asset: { select: { storageKey: true } } },
        },
      },
    });

    if (post) {
      const bodyImageUrls = await Promise.all(
        post.bodyImages.map((image) => resolveAssetUrl(image.asset.storageKey)),
      );

      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: buildNewsExcerpt(post.excerpt || post.body, 160),
        body: post.body,
        publishedAtLabel: formatNewsDate(post.publishedAt),
        categoryName: post.category?.name || "お知らせ",
        imageUrl: await resolveAssetUrl(post.eyecatchAsset?.storageKey),
        bodyImageUrls: bodyImageUrls.filter((url): url is string => Boolean(url)),
      };
    }
  } catch {
    // The local fallback below keeps public news available during DB outages.
  }

  return buildFallbackNews().find((item) => item.slug === slug) ?? null;
});

function buildFallbackNews(): PublicNewsItem[] {
  return fallbackNewsItems.map((item, index) => ({
    id: `fallback-news-${index + 1}`,
    slug: `fallback-news-${index + 1}`,
    title: item.title,
    excerpt: buildNewsExcerpt(item.excerpt, 120),
    body: item.excerpt,
    publishedAtLabel: item.date,
    categoryName: item.category,
    imageUrl: null,
    bodyImageUrls: [],
  }));
}

function formatNewsDate(value: Date | null) {
  if (!value) return "-";

  return value.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}
