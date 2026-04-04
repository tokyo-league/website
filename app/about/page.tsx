import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { aboutSections, downloadItems, siteAssets } from "@/lib/site-data";

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">About</p>
              <h1>東京リーグについて</h1>
              <p>組織概要、役員・理事会、規約関連の情報を、公開サイトの中で落ち着いて確認できる構成です。</p>
              <div className="page-intro__actions">
                <Link href="/downloads" className="button">
                  規約を見る
                </Link>
                <Link href="/contact" className="button button--ghost">
                  お問い合わせ
                </Link>
              </div>
            </div>
            <div className="page-intro__visual">
              <Image
                src={siteAssets.competitionHero}
                alt="池2フットボールクラブ"
                fill
                sizes="(max-width: 960px) 100vw, 32vw"
              />
            </div>
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

        <section className="section-block">
          <div className="container narrow">
            <article className="card card--download">
              <div className="card__header">
                <div>
                  <p className="section-kicker">Documents</p>
                  <h2>主な公開資料</h2>
                </div>
                <Link href="/downloads">資料一覧へ</Link>
              </div>
              <div className="download-shortcuts">
                {downloadItems.map((item) => (
                  <span key={item.title}>{item.title}</span>
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
