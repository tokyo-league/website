import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { teams } from "@/lib/site-data";

export default function TeamsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--compact">
          <div className="container">
            <p className="section-kicker">Teams</p>
            <h1>参加チーム</h1>
            <p>現サイトのチーム写真を活かしながら、一覧性を高めたカード表示に整理します。</p>
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
