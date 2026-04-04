import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { siteAssets } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      region: true,
      founded: true,
      representativeName: true,
      headCoachName: true,
      websiteUrl: true,
      logoPath: true,
      photoPath: true,
      profile: true,
    },
  });

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--teams">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">Teams</p>
              <h1>参加チーム</h1>
              <p>東京リーグ参加チームの紹介一覧です。各チームの写真、ロゴ、基本情報を公開しています。</p>
              <div className="page-intro__actions">
                <Link href="/competitions" className="button">
                  試合情報へ
                </Link>
                <Link href="/contact" className="button button--ghost">
                  お問い合わせ
                </Link>
              </div>
            </div>
            <div className="page-intro__visual page-intro__visual--teams">
              <Image src={siteAssets.teamsHero} alt="参加チーム紹介" fill sizes="100vw" />
              <div className="page-intro__visual-caption">
                <span>Tokyo League Teams</span>
                <strong>横長のメインビジュアルで参加チームの空気感を見せる構成</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container">
            <div className="team-summary">
              <span>掲載チーム {teams.length}</span>
              <span>チーム紹介ページの写真を使用</span>
              <span>公開中チームのみ表示</span>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container team-grid">
            {teams.map((team) => (
              <article key={team.id} className="team-card">
                <div className="team-card__image">
                  <Image
                    src={team.photoPath || siteAssets.teamsHero}
                    alt={team.name}
                    fill
                    sizes="(max-width: 720px) 100vw, (max-width: 960px) 50vw, 33vw"
                  />
                  {team.logoPath ? (
                    <div className="team-card__logo">
                      <Image src={team.logoPath} alt={`${team.name} ロゴ`} width={72} height={72} />
                    </div>
                  ) : null}
                </div>
                <div className="team-card__body">
                  <p className="section-kicker">{team.region || "東京"}</p>
                  <h2>{team.name}</h2>
                  {team.profile ? <p>{team.profile}</p> : null}
                  <dl className="team-card__meta">
                    <div>
                      <dt>結成</dt>
                      <dd>{team.founded || "未設定"}</dd>
                    </div>
                    <div>
                      <dt>代表者</dt>
                      <dd>{team.representativeName || "未設定"}</dd>
                    </div>
                    <div>
                      <dt>監督</dt>
                      <dd>{team.headCoachName || "未設定"}</dd>
                    </div>
                    <div>
                      <dt>URL</dt>
                      <dd>
                        {team.websiteUrl ? (
                          <a href={team.websiteUrl} target="_blank" rel="noreferrer">
                            公式サイトを見る
                          </a>
                        ) : (
                          "未設定"
                        )}
                      </dd>
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
