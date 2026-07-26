import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TeamImportantInformation } from "@/components/team-important-information";

export default function ImportantTeamInformationPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main team-important-page">
        <section className="page-intro page-intro--compact">
          <div className="container narrow">
            <p className="section-kicker">For Participating Teams</p>
            <h1>参加チーム向け重要事項</h1>
            <p>チーム運営と試合参加に必要な、継続して確認していただきたい情報をまとめています。</p>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow">
            <TeamImportantInformation />
          </div>
        </section>

        <section className="section-block section-block--muted">
          <div className="container narrow team-important-page__notice">
            <p className="section-kicker">Updates</p>
            <h2>直近の変更・緊急連絡はニュースでお知らせします</h2>
            <p>日程変更や当日の運営連絡など、時期に応じたお知らせはニュースをご確認ください。</p>
            <Link href="/news" className="button button--ghost">ニュースを見る <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
