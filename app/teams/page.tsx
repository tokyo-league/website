import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteAssets, teams } from "@/lib/site-data";

export default function TeamsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">Teams</p>
              <h1>参加チーム</h1>
              <p>現サイトの写真とロゴを使いながら、チームの基本情報を一覧で確認しやすく整理します。</p>
              <div className="page-intro__actions">
                <Link href="/competitions" className="button">
                  試合情報へ
                </Link>
                <Link href="/contact" className="button button--ghost">
                  お問い合わせ
                </Link>
              </div>
            </div>
            <div className="page-intro__visual">
              <Image
                src={siteAssets.featuredTeamPhoto}
                alt="旭フットボールクラブ"
                fill
                sizes="(max-width: 960px) 100vw, 32vw"
              />
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container">
            <div className="team-summary">
              <span>掲載チーム 3</span>
              <span>写真・ロゴは現サイトから移設</span>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container team-grid">
            {teams.map((team) => (
              <article key={team.name} className="team-card">
                <div className="team-card__image">
                  <Image
                    src={team.image}
                    alt={team.name}
                    fill
                    sizes="(max-width: 720px) 100vw, (max-width: 960px) 50vw, 33vw"
                  />
                  {"logo" in team && team.logo ? (
                    <div className="team-card__logo">
                      <Image src={team.logo} alt={`${team.name} ロゴ`} width={72} height={72} />
                    </div>
                  ) : null}
                </div>
                <div className="team-card__body">
                  <p className="section-kicker">{team.area}</p>
                  <h2>{team.name}</h2>
                  <dl className="team-card__meta">
                    <div>
                      <dt>結成</dt>
                      <dd>{team.founded}</dd>
                    </div>
                    <div>
                      <dt>代表者</dt>
                      <dd>{team.representative}</dd>
                    </div>
                    <div>
                      <dt>監督</dt>
                      <dd>{team.coach}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
