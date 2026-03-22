import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { aboutSections } from "@/lib/site-data";

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--compact">
          <div className="container narrow">
            <p className="section-kicker">About</p>
            <h1>東京リーグについて</h1>
            <p>組織概要、役員・理事会、規約関連の情報を集約して掲載します。</p>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow">
            <div className="text-section-stack">
              {aboutSections.map((section) => (
                <article key={section.title} className="text-section">
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
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
