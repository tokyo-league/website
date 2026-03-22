import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { newsItems } from "@/lib/site-data";

export default function NewsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--compact">
          <div className="container">
            <p className="section-kicker">News</p>
            <h1>ニュース</h1>
            <p>お知らせ、大会情報、募集情報をカテゴリごとに整理して掲載します。</p>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow">
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
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
