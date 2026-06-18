import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteAssets } from "@/lib/site-data";

const overviewItems = [
  { label: "名称", value: "東京少年サッカー連盟" },
  { label: "創立", value: "1979年 東京23区の少年サッカーチーム13チームで創立" },
  { label: "参加チーム", value: "現在都内の少年チーム88チームが参加" },
  { label: "理事会", value: "年6回開催、必要に応じて臨時開催" },
];

const mainActivities = [
  "参加チームにより年2回のリーグ戦を展開",
  "オープン大会を年1回開催し、加盟チームが一会場に集まる機会をつくる",
  "国際交流大会を年1回実施する",
  "参加チームの選手育成を進める",
  "少年審判員の育成と審判講習会の実施を行う",
];

const boardMembers = [
  { role: "顧問", name: "宮崎 昇作", duty: "" },
  { role: "会長", name: "三木 健一郎", duty: "後援会会長" },
  { role: "特任理事", name: "山藤 武久", duty: "" },
  { role: "副会長", name: "湯澤 茂", duty: "海外交流" },
  { role: "副会長", name: "田島 政文", duty: "U7,8,9,10フェス" },
  { role: "理事長", name: "真田 実", duty: "事務局" },
  { role: "理事", name: "浅田 春美", duty: "総務" },
  { role: "理事", name: "丸山 雄介", duty: "U7,8,9,10フェス" },
  { role: "理事", name: "上田 道弘", duty: "山藤杯" },
  { role: "理事", name: "岩間 孝俊", duty: "広報" },
  { role: "理事", name: "福田 茂", duty: "会計" },
  { role: "理事", name: "大田 謙一", duty: "会計" },
  { role: "理事", name: "五十嵐 正", duty: "西川杯" },
  { role: "会計監査", name: "桜井 保明", duty: "" },
];

const effortGoals = [
  "サッカーの競技力を高め、リーグ運営では子どもたちが活動できる試合会場を継続して提供できるよう努める。",
  "すべての子どもたちが試合に参加できるよう、長期的な視点で活動し、日々の練習や試合を通じて人としての基礎を育む。",
  "加盟チームは連盟の活動に積極的に参加し、企画や運営に協力する。",
  "東京リーグに関わるすべての活動が、サッカー競技に限らず社会的にも有益なものとなるよう努める。",
];

export default function AboutPage() {
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
                  {mainActivities.map((item) => (
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
                    <div key={`${member.role}-${member.name}`} className="about-board__row">
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
                <p>
                  加盟するチーム関係者が互いに協働し、サッカーを通じて少年少女の健やかな成長を支え、
                  その資質を高めていくことを基本に据えています。その積み重ねを通じて、連盟の活動が
                  社会にも貢献することを目指します。
                </p>
              </article>

              <article className="text-section">
                <h2>努力目標</h2>
                <ol className="text-list text-list--numbered">
                  {effortGoals.map((item) => (
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
