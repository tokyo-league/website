import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { competitionCategories } from "@/lib/competition-category";
import { siteAssets } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default function CompetitionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--feature">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">Competition</p>
              <h1>試合情報</h1>
              <p>大会ごとに、開催中の試合結果と過去大会のアーカイブを確認できます。</p>
              <div className="page-intro__actions">
                <Link href="/downloads" className="button">
                  要項を見る
                </Link>
                <Link href="/news" className="button button--ghost">
                  関連ニュース
                </Link>
              </div>
            </div>
            <div className="page-intro__visual page-intro__visual--feature">
              <Image src={siteAssets.competitionMainVisual} alt="東京リーグの試合情報" fill sizes="100vw" />
              <div className="page-intro__visual-caption">
                <span>Tokyo League Match</span>
                <strong>試合情報</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Tournament</p>
                <h2>大会を選ぶ</h2>
              </div>
            </div>
            <div className="competition-card-grid">
              {Object.values(competitionCategories).map((category) => (
                <article key={category.slug} className="card competition-card">
                  <p className="section-kicker">{category.kicker}</p>
                  <h2>{category.name}</h2>
                  <p>{category.description}</p>
                  <div className="page-intro__actions">
                    <Link href={`/competitions/${category.slug}`} className="button">
                      試合結果を見る
                    </Link>
                  </div>
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
