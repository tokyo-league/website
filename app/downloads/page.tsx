import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { downloadItems } from "@/lib/site-data";

export default function DownloadsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--compact">
          <div className="container narrow">
            <p className="section-kicker">Downloads</p>
            <h1>資料ダウンロード</h1>
            <p>規約、要項、その他の資料をカテゴリ単位で整理して掲載します。</p>
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
      </main>
      <SiteFooter />
    </>
  );
}
