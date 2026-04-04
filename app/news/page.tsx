import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { downloadItems, newsItems, siteAssets } from "@/lib/site-data";

export default function NewsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">News</p>
              <h1>ニュース</h1>
              <p>お知らせ、大会情報、募集情報をカテゴリごとに整理して掲載します。</p>
            </div>
            <div className="page-intro__visual">
              <Image src={siteAssets.newsHero} alt="東京リーグのニュース" fill sizes="(max-width: 960px) 100vw, 32vw" />
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container news-layout">
            <div className="news-layout__main">
              <div className="filter-row">
                <span className="filter-pill is-active">すべて</span>
                <span className="filter-pill">大会情報</span>
                <span className="filter-pill">お知らせ</span>
              </div>
              <div className="list-stack">
                {newsItems.map((item) => (
                  <article key={item.title} className="list-row list-row--large">
                    <p className="list-row__meta">
                      <span>{item.date}</span>
                      <span>{item.category}</span>
                    </p>
                    <h2>{item.title}</h2>
                    <p>{item.excerpt}</p>
                  </article>
                ))}
              </div>
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
