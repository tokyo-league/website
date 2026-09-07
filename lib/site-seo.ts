import type { Metadata } from "next";

export const siteName = "東京リーグ";
export const siteDescription = "東京少年サッカー連盟 東京リーグの公式サイト。大会情報、試合結果、ニュース、参加チーム情報を掲載しています。";
export const defaultOgImage = "/site-assets/mv/mv_top.jpg";

// Preview and temporary hostnames must never become canonical URLs.
export const siteUrl = getConfiguredSiteUrl();

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  keywords?: string[];
  type?: "website" | "article";
};

export function createPageMetadata({ title, description, path, image = defaultOgImage, keywords = [], type = "website" }: PageMetadataOptions): Metadata {
  const url = path ? getAbsoluteUrl(path) : undefined;
  const ogImage = image ? getAbsoluteUrl(image) : undefined;

  return {
    title,
    description,
    keywords: ["東京リーグ", "東京少年サッカー", "ジュニアサッカー", ...keywords],
    alternates: url ? { canonical: url } : undefined,
    openGraph: { type, locale: "ja_JP", siteName, title, description, url, images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : undefined },
    twitter: { card: ogImage ? "summary_large_image" : "summary", title, description, images: ogImage ? [ogImage] : undefined },
  };
}

export function getAbsoluteUrl(path: string): string | undefined {
  if (/^https?:\/\//i.test(path)) return path;
  if (!siteUrl) return undefined;
  return new URL(path, siteUrl).toString();
}

function getConfiguredSiteUrl(): URL | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return new URL(`${url.origin}/`);
  } catch {
    return undefined;
  }
}
