import Image from "next/image";
import Link from "next/link";
import { PublishStatus } from "@prisma/client";
import { NewsModalList } from "@/components/news-modal-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { resolveAssetUrl } from "@/lib/asset-url";
import { buildNewsExcerpt } from "@/lib/news-text";
import { prisma } from "@/lib/prisma";
import { downloadItems, newsItems as fallbackNewsItems, siteAssets } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const posts = await getPublishedNews();

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--feature">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">News</p>
              <h1>ニュース</h1>
            </div>
            <div className="page-intro__visual page-intro__visual--feature">
              <Image src={siteAssets.newsHero} alt="東京リーグのニュース" fill sizes="100vw" />
              <div className="page-intro__visual-caption">
                <span>Tokyo League News</span>
                <strong>ニュース</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container news-layout">
            <div className="news-layout__main">
              <div className="filter-row">
                <span className="filter-pill is-active">すべて</span>
                <span className="filter-pill">お知らせ</span>
              </div>
              <NewsModalList items={posts} />
            </div>

            <aside className="news-layout__side">
              <article className="card">
                <div className="card__header">
                  <div>
                    <p className="section-kicker">Documents</p>
                    <h2>関連資料</h2>
                  </div>
                  <Link href="/downloads">資料一覧へ</Link>
                </div>
                <div className="download-shortcuts">
                  {downloadItems.map((item) => (
                    <span key={item.title}>{item.title}</span>
                  ))}
                </div>
              </article>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

async function getPublishedNews() {
  try {
    const posts = await prisma.newsPost.findMany({
      where: {
        status: PublishStatus.PUBLISHED,
      },
      include: {
        category: true,
        eyecatchAsset: {
          select: {
            storageKey: true,
          },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });

    return Promise.all(posts.map(async (post) => ({
      id: post.id,
      title: post.title,
      excerpt: buildNewsExcerpt(post.body, 120),
      body: post.body,
      publishedAtLabel: formatDate(post.publishedAt),
      categoryName: "お知らせ",
      imageUrl: await resolveAssetUrl(post.eyecatchAsset?.storageKey),
    })));
  } catch {
    return fallbackNewsItems.map((item, index) => ({
      id: `fallback-${index + 1}`,
      title: item.title,
      excerpt: buildNewsExcerpt(item.excerpt, 120),
      body: item.excerpt,
      publishedAtLabel: item.date,
      categoryName: item.category,
      imageUrl: null,
    }));
  }
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}
