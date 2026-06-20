import Image from "next/image";
import { NewsList } from "@/components/news-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedNews } from "@/lib/public-news";
import { siteAssets } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const posts = await getPublishedNews();

  return (
    <>
      <SiteHeader />
      <main className="page-main page-main--news">
        <section className="page-intro page-intro--feature page-intro--news">
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
          <div className="container narrow news-index">
            <div className="filter-row">
              <span className="filter-pill is-active">すべて</span>
              <span className="filter-pill">お知らせ</span>
            </div>
            <NewsList items={posts} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
