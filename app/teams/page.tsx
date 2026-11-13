import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { siteAssets } from "@/lib/site-data";
import { getTeamInitial, isDisplayableTeamLogo } from "@/lib/team-logo";
import { sortTeamsByName } from "@/lib/team-sort";
import { createPageMetadata } from "@/lib/site-seo";
import { getUniformSwatches } from "@/lib/team-uniform-colors";

const importedTeamProfile = "過去大会結果取り込み用の仮登録チームです。";

export const dynamic = "force-dynamic";
export const metadata = createPageMetadata({
  title: "参加チーム",
  description: "東京リーグに参加する少年サッカーチームの基本情報、活動地域、チーム紹介を掲載しています。",
  path: "/teams",
  image: siteAssets.teamsHero,
  keywords: ["参加チーム", "少年サッカーチーム", "東京都"],
});

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
                const profile = team.profile?.trim();
                const showProfile = Boolean(profile && profile !== importedTeamProfile);
                const homeUniform = team.homeUniformColor?.trim();
                const awayUniform = team.awayUniformColor?.trim();

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
                    {showProfile || homeUniform || awayUniform ? (
                      <div className="team-card__body">
                        {showProfile ? <p className="team-card__profile">{profile}</p> : null}
                        {homeUniform || awayUniform ? (
                          <div className="team-card__uniforms" role="group" aria-label="ユニフォームの色">
                            {homeUniform ? <UniformDescription label="ホーム" description={homeUniform} /> : null}
                            {awayUniform ? <UniformDescription label="アウェイ" description={awayUniform} /> : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
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
  const colors = getUniformSwatches(description);

  return (
    <div>
      <small>{label}</small>
      {colors.length > 0 ? (
        <div className="team-card__swatches" aria-hidden="true">
          {colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
        </div>
      ) : null}
      <span className={/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(description) ? "visually-hidden" : undefined}>
        {description}
      </span>
    </div>
  );
}
