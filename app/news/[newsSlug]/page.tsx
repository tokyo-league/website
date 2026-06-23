import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { normalizeNewsBody } from "@/lib/news-text";
import { getPublishedNewsBySlug } from "@/lib/public-news";
import { siteAssets } from "@/lib/site-data";

export const dynamic = "force-dynamic";

type NewsDetailPageProps = {
  params: Promise<{ newsSlug: string }>;
};

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { newsSlug } = await params;
  const news = await getPublishedNewsBySlug(newsSlug);

  if (!news) return {};

  return {
    title: news.title,
    description: news.excerpt,
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { newsSlug } = await params;
  const news = await getPublishedNewsBySlug(newsSlug);

  if (!news) notFound();

  const paragraphs = normalizeNewsBody(news.body).split(/\n{2,}/).filter(Boolean);

  return (
    <>
      <SiteHeader />
      <main className="page-main news-detail-page">
        <article>
          <header className="news-detail-hero">
            <div className="container news-detail-hero__inner">
              <div className="news-detail-hero__copy">
                <Link href="/news" className="news-detail-back">← ニュース一覧</Link>
                <p className="section-kicker">JOURNAL / {news.categoryName}</p>
                <h1>{news.title}</h1>
                <p className="news-detail-hero__date">{news.publishedAtLabel}</p>
              </div>
              <figure className="news-detail-hero__media">
                <Image
                  src={news.imageUrl || siteAssets.newsHero}
                  alt={news.imageUrl ? news.title : "東京リーグ ニュース"}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 54vw"
                />
              </figure>
            </div>
          </header>

          <div className="container news-detail-body">
            <div className="news-detail-body__label">
              <p className="section-kicker">ARTICLE</p>
              <span />
            </div>
            <div className="news-detail-body__content">
              {news.bodyImageUrls.length > 0 ? (
                <div className="news-detail-body__images" aria-label="記事画像">
                  {news.bodyImageUrls.map((imageUrl, index) => (
                    <figure key={imageUrl} className="news-detail-body__image">
                      <Image
                        src={imageUrl}
                        alt={`${news.title}の記事画像 ${index + 1}`}
                        width={1200}
                        height={800}
                        sizes="(max-width: 700px) 100vw, 760px"
                      />
                    </figure>
                  ))}
                </div>
              ) : null}
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{renderTextWithLinks(paragraph)}</p>
              ))}
              <Link href="/news" className="news-detail-return">ニュース一覧へ戻る <span>→</span></Link>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

function renderTextWithLinks(text: string): ReactNode[] | string {
  const matches = [...text.matchAll(URL_PATTERN)];
  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const url = match[0];
    const start = match.index ?? 0;
    if (cursor < start) nodes.push(text.slice(cursor, start));
    nodes.push(
      <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer noopener" className="news-inline-link">
        {url}
      </a>,
    );
    cursor = start + url.length;
  });

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
