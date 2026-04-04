import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { downloadItems, newsItems } from "@/lib/site-data";

export default function DownloadsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--compact">
          <div className="container narrow">
            <p className="section-kicker">Downloads</p>
            <h1>資料ダウンロード</h1>
            <p>規約、要項、注意事項など、公開資料をまとめて確認できるページです。</p>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow">
            <div className="list-stack">
              {downloadItems.map((item) => (
                <article key={item.title} className="list-row list-row--large">
                  <p className="list-row__meta">
                    <span>{item.category}</span>
                    <span>{item.updatedAt}</span>
                  </p>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow">
            <article className="card">
              <div className="card__header">
                <div>
                  <p className="section-kicker">Related News</p>
                  <h2>資料に関するお知らせ</h2>
                </div>
                <Link href="/news">ニュース一覧へ</Link>
              </div>
              <div className="list-stack">
                {newsItems.slice(0, 2).map((item) => (
                  <article key={item.title} className="list-row">
                    <p className="list-row__meta">
                      <span>{item.date}</span>
                      <span>{item.category}</span>
                    </p>
                    <h3>{item.title}</h3>
                    <p>{item.excerpt}</p>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
