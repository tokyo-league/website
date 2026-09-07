import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ContactForm } from "@/components/contact-form";
import { getTurnstileSiteKey } from "@/lib/contact";
import { contactInfo, siteAssets } from "@/lib/site-data";
import { createPageMetadata } from "@/lib/site-seo";

export const metadata = createPageMetadata({
  title: "お問い合わせ",
  description: "東京少年サッカー連盟 東京リーグへのご質問・ご相談はお問い合わせフォームからお送りください。",
  path: "/contact",
  image: siteAssets.contactHero,
  keywords: ["問い合わせ", "連絡先"],
});

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--feature">
          <div className="container page-intro__inner">
            <div>
              <p className="section-kicker">Contact</p>
              <h1>お問い合わせ</h1>
              <p>東京リーグへのご質問・ご相談を受け付けています。</p>
            </div>
            <div className="page-intro__visual page-intro__visual--feature">
              <Image src={siteAssets.contactHero} alt="お問い合わせ" fill sizes="100vw" />
              <div className="page-intro__visual-caption">
                <span>Tokyo League Contact</span>
                <strong>お問い合わせ</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow">
            <article className="text-section contact-section">
              <h2>お問い合わせフォーム</h2>
              <p>{contactInfo.body}</p>
              <ContactForm siteKey={getTurnstileSiteKey()} />
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
