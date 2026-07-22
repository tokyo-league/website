import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAboutContent } from "@/lib/about-content";
import { getBoardMembers } from "@/lib/board-members";
import { siteAssets } from "@/lib/site-data";

export default async function AboutPage() {
  noStore();
  const [boardMembers, content] = await Promise.all([getBoardMembers(), getAboutContent()]);
  const overviewItems = [
    { label: "名称", value: content.overview.name },
    { label: "創立", value: content.overview.founded },
    { label: "参加チーム", value: content.overview.participatingTeams },
    { label: "総会/納会", value: content.overview.generalMeetingReception },
  ];

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--feature">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">Profile</p>
              <h1>東京リーグについて</h1>
              <div className="page-intro__actions">
                <Link href="/downloads" className="button">
                  規約・資料を見る
                </Link>
                <Link href="/contact" className="button button--ghost">
                  お問い合わせ
                </Link>
              </div>
            </div>
            <div className="page-intro__visual page-intro__visual--feature">
              <Image src={siteAssets.aboutHero} alt="東京リーグについて" fill sizes="100vw" />
              <div className="page-intro__visual-caption">
                <span>Tokyo League Profile</span>
                <strong>東京少年サッカー連盟</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container">
            <div className="text-section-stack">
              <article className="text-section">
                <h2>組織概要</h2>
                <div className="about-overview">
                  {overviewItems.map((item) => (
                    <div key={item.label} className="about-overview__row">
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </div>
              </article>

              <article className="text-section">
                <h2>主な事業</h2>
                <ul className="text-list">
                  {content.mainActivities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="text-section">
                <h2>理事会</h2>
                <div className="about-board">
                  <div className="about-board__row about-board__row--head">
                    <span>役職</span>
                    <span>氏名</span>
                    <span>担当</span>
                  </div>
                  {boardMembers.map((member) => (
                    <div key={member.id} className="about-board__row">
                      <span className="about-board__role">{member.role}</span>
                      <strong className="about-board__name">{member.name}</strong>
                      <span className={`about-board__duty${member.duty ? "" : " is-empty"}`}>
                        {member.duty || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="text-section">
                <h2>規約</h2>
                <p>規約・規約細則は資料ダウンロードページから確認できます。運用上は常に最新版の資料を掲載します。</p>
                <div className="page-intro__actions">
                  <Link href="/downloads" className="button">
                    規約を見る
                  </Link>
                </div>
              </article>

              <article className="text-section">
                <h2>東京少年サッカー連盟の根本原則</h2>
                <p className="text-section__body">{content.fundamentalPrinciple}</p>
              </article>

              <article className="text-section">
                <h2>努力目標</h2>
                <ol className="text-list text-list--numbered">
                  {content.effortGoals.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </article>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
