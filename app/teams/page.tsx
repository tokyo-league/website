import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { siteAssets } from "@/lib/site-data";
import { getTeamInitial, isDisplayableTeamLogo } from "@/lib/team-logo";
import { sortTeamsByName } from "@/lib/team-sort";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = sortTeamsByName(await prisma.team.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      id: true,
      name: true,
      region: true,
      logoPath: true,
      homeUniformColor: true,
      awayUniformColor: true,
      profile: true,
    },
  }));

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--teams">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">Teams</p>
              <h1>参加チーム</h1>
              <p>東京リーグに参加するチームをご紹介します。ロゴと基本情報から、各チームの個性をご覧いただけます。</p>
              <div className="page-intro__actions">
                <Link href="/teams/important" className="button">
                  参加チーム向け重要事項
                </Link>
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
                <strong>チーム紹介</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container teams-list-section">
            <div className="team-summary">
              <span>掲載チーム {teams.length}</span>
            </div>
            <div className="team-grid">
              {teams.map((team, index) => {
                const hasTeamLogo = isDisplayableTeamLogo(team.logoPath);

                return (
                  <article key={team.id} className="team-card">
                    <div className="team-card__identity">
                      <span className="team-card__number" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {hasTeamLogo ? (
                        <div className="team-card__logo">
                          <Image src={team.logoPath!} alt={`${team.name} ロゴ`} width={112} height={112} />
                        </div>
                      ) : (
                        <div className="team-card__logo team-card__logo--fallback" aria-hidden="true">
                          {getTeamInitial(team.name)}
                        </div>
                      )}
                      <p>{team.region || "東京都内"}</p>
                      <h2>{team.name}</h2>
                    </div>
                    <div className="team-card__body">
                      {team.profile ? <p className="team-card__profile">{team.profile}</p> : null}
                      {team.homeUniformColor || team.awayUniformColor ? (
                        <div className="team-card__uniforms" aria-label="ユニフォームの色">
                          {team.homeUniformColor ? <UniformDescription label="ホーム" description={team.homeUniformColor} /> : null}
                          {team.awayUniformColor ? <UniformDescription label="アウェイ" description={team.awayUniformColor} /> : null}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function UniformDescription({ label, description }: { label: string; description: string }) {
  return (
    <div>
      <small>{label}</small>
      <span>{description}</span>
    </div>
  );
}
